const fs = require('fs');
const path = require('path');
const config = require('./config');
const RobotsChecker = require('./robots');
const PoliteFetcher = require('./fetcher');
const { parseBookListing } = require('./parser');
const { validateBooks } = require('./schema');

class PoliteScraper {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.robotsChecker = new RobotsChecker({
      userAgent: this.config.userAgent,
      robotsUrl: `${this.config.baseUrl}/robots.txt`
    });
    this.fetcher = new PoliteFetcher({
      userAgent: this.config.userAgent,
      requestDelayMs: this.config.requestDelayMs,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      timeoutMs: this.config.timeoutMs
    });
  }

  /**
   * Initializes robots.txt check
   */
  async init() {
    console.log(`[PoliteScraper] Checking robots.txt rules for ${this.config.baseUrl}...`);
    await this.robotsChecker.init();
    const crawlDelay = this.robotsChecker.getCrawlDelay();
    if (crawlDelay && crawlDelay > this.config.requestDelayMs) {
      console.log(`[PoliteScraper] Adjusting delay to ${crawlDelay}ms as specified in robots.txt`);
      this.fetcher.requestDelayMs = crawlDelay;
    }
  }

  /**
   * Scrapes a single page by index
   * @param {number} pageNum 
   * @returns {Promise<{ books: Array<object>, errors: Array<object> }>}
   */
  async scrapePage(pageNum) {
    const pageUrl = this.config.pagePattern(pageNum);

    if (!this.robotsChecker.isAllowed(pageUrl)) {
      console.warn(`[PoliteScraper] URL disallowed by robots.txt: ${pageUrl}`);
      return { books: [], errors: [{ pageNum, url: pageUrl, error: 'Disallowed by robots.txt' }] };
    }

    console.log(`[PoliteScraper] Fetching page ${pageNum}/${this.config.targetPagesCount}: ${pageUrl}`);
    const { html } = await this.fetcher.fetch(pageUrl);

    console.log(`[PoliteScraper] Parsing HTML for page ${pageNum}...`);
    const { books, errors } = parseBookListing(html, pageUrl);

    console.log(`[PoliteScraper] Page ${pageNum} done: Extracted ${books.length} raw books (${errors.length} parsing errors).`);
    return { books, errors };
  }

  /**
   * Runs the full polite scraping pipeline across all target pages
   * @returns {Promise<object>} Execution summary report
   */
  async run() {
    const startTime = Date.now();
    const pagesCount = this.config.targetPagesCount;

    await this.init();

    const allRawBooks = [];
    const executionErrors = [];
    let successfulPages = 0;

    for (let pageNum = 1; pageNum <= pagesCount; pageNum++) {
      try {
        const { books, errors } = await this.scrapePage(pageNum);
        allRawBooks.push(...books);
        if (errors && errors.length > 0) {
          executionErrors.push(...errors.map(e => ({ pageNum, ...e })));
        }
        successfulPages++;
      } catch (pageErr) {
        console.error(`[PoliteScraper] Failed to scrape page ${pageNum}: ${pageErr.message}`);
        executionErrors.push({ pageNum, error: pageErr.message });
      }
    }

    console.log(`[PoliteScraper] Validating ${allRawBooks.length} raw book records against Zod schema...`);
    const { validBooks, invalidBooks } = validateBooks(allRawBooks);

    // Save output
    const outputDir = path.dirname(this.config.outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const payload = {
      scrapedAt: new Date().toISOString(),
      metadata: {
        targetPages: pagesCount,
        successfulPages,
        totalRawExtracted: allRawBooks.length,
        totalValid: validBooks.length,
        totalInvalid: invalidBooks.length,
        totalErrors: executionErrors.length
      },
      books: validBooks
    };

    fs.writeFileSync(this.config.outputFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[PoliteScraper] Saved ${validBooks.length} validated book records to ${this.config.outputFilePath}`);

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    return {
      durationMs,
      pagesAttempted: pagesCount,
      pagesSuccessful: successfulPages,
      totalExtracted: allRawBooks.length,
      validCount: validBooks.length,
      invalidCount: invalidBooks.length,
      invalidDetails: invalidBooks,
      errors: executionErrors,
      outputFilePath: this.config.outputFilePath
    };
  }
}

module.exports = PoliteScraper;
