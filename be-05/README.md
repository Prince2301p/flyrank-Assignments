# BE-05: The Polite Scraper

A polite, resilient, schema-validated web scraper built in Node.js for collecting structured data from web pages without overburdening target servers.

Designed to collect 60 book records across 3 pages of the free sandbox site `http://books.toscrape.com`, clean messy HTML data (such as converting `"£51.77"` to float `51.77` and `"Three"` to integer `3`), validate every record against a strict Zod schema, and survive broken or malformed HTML gracefully.

---

## Key Features & Professional Habits

1. **Robots.txt Compliance**: Checks target site's `robots.txt` rules prior to making requests and respects `Crawl-delay` directives.
2. **Identification (User-Agent)**: Declares bot identity with a custom `User-Agent` header (`PoliteBookScraper/1.0 (+https://github.com/Prince2301p/flyrank-Assignments)`).
3. **Throttled Rate Limiting**: Enforces configurable polite delays (default 1000ms) between consecutive HTTP GET requests.
4. **Exponential Backoff & Retries**: Retries transient server errors (5xx, 429) automatically with exponential backoff delays.
5. **Clean Data Normalization**:
   - `cleanPrice("£51.77")` &rarr; `51.77` (numeric float)
   - `parseRating("star-rating Three")` &rarr; `3` (integer rating 1-5)
   - `parseAvailability("In stock")` &rarr; `true` (boolean)
6. **Strict Schema Validation (Zod)**: Validates extracted records against `BookSchema`. Invalid records are isolated and logged without crashing the process.
7. **Fault Tolerance**: Per-item parsing isolation allows the scraper to process broken or incomplete HTML pages without failing the pipeline.

---

## Project Structure

```
.
├── src/
│   ├── config.js         # Configuration settings & environment variables
│   ├── fetcher.js        # Polite HTTP fetcher with rate limiting & backoff retries
│   ├── index.js          # CLI entry point
│   ├── parser.js         # Cheerio HTML parser & data cleaners
│   ├── robots.js         # Robots.txt parser and rule checker
│   ├── schema.js         # Zod validation schema & helpers
│   └── scraper.js        # Main scraper pipeline orchestrator
├── tests/
│   ├── fetcher.test.js   # Unit tests for polite fetcher & rate limiting
│   ├── parser.test.js    # Unit tests for Cheerio parser & cleaning logic
│   ├── robots.test.js    # Unit tests for robots.txt rules parser
│   ├── schema.test.js    # Unit tests for Zod schema validation
│   └── scraper.test.js   # Integration tests for end-to-end scraper pipeline
├── fixtures/
│   ├── broken-page.html  # Fixture containing corrupt/missing HTML fields
│   └── sample-page.html  # Fixture containing sample book cards
├── output/
│   └── books.json        # Output JSON destination
├── .env.example          # Environment variable template
├── jest.config.js        # Jest runner configuration
└── package.json          # Node.js project manifest & dependencies
```

---

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables** (Optional):
   Copy `.env.example` to `.env` to customize scraping behavior:
   ```env
   BASE_URL=http://books.toscrape.com
   START_URL=http://books.toscrape.com/catalogue/page-1.html
   TARGET_PAGES_COUNT=3
   USER_AGENT=PoliteBookScraper/1.0 (+https://github.com/Prince2301p/flyrank-Assignments)
   REQUEST_DELAY_MS=1000
   MAX_RETRIES=3
   OUTPUT_FILE_PATH=./output/books.json
   ```

---

## Running the Scraper

To run the live polite scraper against `books.toscrape.com`:

```bash
npm start
```
or
```bash
npm run scrape
```

### Sample Output CLI Summary

```
====================================================
       BE-05: The Polite Scraper Starting           
====================================================
[PoliteScraper] Checking robots.txt rules for http://books.toscrape.com...
[PoliteScraper] Fetching page 1/3: http://books.toscrape.com/catalogue/page-1.html
[PoliteScraper] Parsing HTML for page 1...
[PoliteScraper] Page 1 done: Extracted 20 raw books (0 parsing errors).
[PoliteScraper] Fetching page 2/3: http://books.toscrape.com/catalogue/page-2.html
[PoliteScraper] Parsing HTML for page 2...
[PoliteScraper] Page 2 done: Extracted 20 raw books (0 parsing errors).
[PoliteScraper] Fetching page 3/3: http://books.toscrape.com/catalogue/page-3.html
[PoliteScraper] Parsing HTML for page 3...
[PoliteScraper] Page 3 done: Extracted 20 raw books (0 parsing errors).
[PoliteScraper] Validating 60 raw book records against Zod schema...
[PoliteScraper] Saved 60 validated book records to ./output/books.json

----------------------------------------------------
               Scraping Summary Report              
----------------------------------------------------
Execution Time   : 3.26s
Pages Processed  : 3/3
Raw Extracted    : 60 books
Schema Validated : 60 books
Schema Invalid   : 0 books
Parsing Errors   : 0
Output Location  : ./output/books.json
----------------------------------------------------

[SUCCESS] Polite Scraper completed successfully!
```

---

## Running Automated Tests

Run the full automated Jest test suite:

```bash
npm test
```

### Test Coverage

- **`tests/parser.test.js`**: Verifies price string cleaning, star rating parsing, availability detection, fixture extraction, and broken-page resilience.
- **`tests/schema.test.js`**: Verifies Zod schema rules (positive price, integer rating 1-5, valid URL formatting).
- **`tests/fetcher.test.js`**: Verifies rate-limiting delays and sleep helpers.
- **`tests/robots.test.js`**: Verifies `robots.txt` compliance parsing.
- **`tests/scraper.test.js`**: Verifies full scraper pipeline execution end-to-end with mocked HTML pages.

---

## Data Output Schema (`output/books.json`)

```json
{
  "scrapedAt": "2026-08-26T13:06:52.370Z",
  "metadata": {
    "targetPages": 3,
    "successfulPages": 3,
    "totalRawExtracted": 60,
    "totalValid": 60,
    "totalInvalid": 0,
    "totalErrors": 0
  },
  "books": [
    {
      "id": "a-light-in-the-attic_1000",
      "title": "A Light in the Attic",
      "price": 51.77,
      "currency": "GBP",
      "rating": 3,
      "inStock": true,
      "url": "http://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      "imageUrl": "http://books.toscrape.com/media/cache/2c/da/2cdad67c44b002e7ead0cc35693c0e8b.jpg"
    }
  ]
}
```

---

## License

MIT License
