const path = require('path');
require('dotenv').config();

module.exports = {
  baseUrl: process.env.BASE_URL || 'http://books.toscrape.com',
  startUrl: process.env.START_URL || 'http://books.toscrape.com/catalogue/page-1.html',
  pagePattern: (pageNumber) => `http://books.toscrape.com/catalogue/page-${pageNumber}.html`,
  targetPagesCount: parseInt(process.env.TARGET_PAGES_COUNT, 10) || 3,
  booksPerPage: 20,
  userAgent: process.env.USER_AGENT || 'PoliteBookScraper/1.0 (+https://github.com/Prince2301p/flyrank-Assignments)',
  requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS, 10) || 1000,
  maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS, 10) || 1000,
  outputFilePath: process.env.OUTPUT_FILE_PATH || path.join(__dirname, '../output/books.json'),
  timeoutMs: parseInt(process.env.TIMEOUT_MS, 10) || 10000
};
