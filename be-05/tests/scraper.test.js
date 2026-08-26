const fs = require('fs');
const path = require('path');
const axios = require('axios');
const PoliteScraper = require('../src/scraper');

describe('PoliteScraper Integration Tests', () => {
  const testOutputPath = path.join(__dirname, '../output/test-books.json');

  beforeEach(() => {
    jest.spyOn(axios, 'get').mockImplementation(async (url) => {
      if (url.includes('robots.txt')) {
        return { status: 200, data: 'User-agent: *\nAllow: /' };
      }
      return { status: 200, data: '' };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });

  test('runs full pipeline with mocked page fetcher and writes JSON output file', async () => {
    const sampleHtml = fs.readFileSync(path.join(__dirname, '../fixtures/sample-page.html'), 'utf-8');

    const scraper = new PoliteScraper({
      targetPagesCount: 2,
      requestDelayMs: 0,
      outputFilePath: testOutputPath
    });

    jest.spyOn(scraper.fetcher, 'fetch').mockResolvedValue({
      html: sampleHtml,
      status: 200,
      url: 'http://books.toscrape.com/catalogue/page-1.html'
    });

    const report = await scraper.run();

    expect(report.pagesSuccessful).toBe(2);
    expect(report.totalExtracted).toBe(10); // 5 books per page * 2 pages
    expect(report.validCount).toBe(10);
    expect(report.invalidCount).toBe(0);
    expect(fs.existsSync(testOutputPath)).toBe(true);

    const savedContent = JSON.parse(fs.readFileSync(testOutputPath, 'utf-8'));
    expect(savedContent.books).toHaveLength(10);
    expect(savedContent.books[0].title).toBe('A Light in the Attic');
    expect(savedContent.books[0].price).toBe(51.77);
  });
});
