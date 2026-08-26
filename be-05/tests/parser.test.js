const fs = require('fs');
const path = require('path');
const {
  cleanPrice,
  parseRating,
  parseAvailability,
  parseBookListing
} = require('../src/parser');

describe('Parser Module Unit Tests', () => {
  describe('cleanPrice()', () => {
    test('extracts float price from currency string', () => {
      expect(cleanPrice('£51.77')).toBe(51.77);
      expect(cleanPrice('£0.99')).toBe(0.99);
      expect(cleanPrice('  £ 12.50 ')).toBe(12.5);
      expect(cleanPrice('£1,234.56')).toBe(1234.56);
    });

    test('returns null for invalid price strings or non-strings', () => {
      expect(cleanPrice('Free')).toBeNull();
      expect(cleanPrice('')).toBeNull();
      expect(cleanPrice(null)).toBeNull();
      expect(cleanPrice(undefined)).toBeNull();
    });
  });

  describe('parseRating()', () => {
    test('converts rating word class to integer 1-5', () => {
      expect(parseRating('star-rating One')).toBe(1);
      expect(parseRating('star-rating Two')).toBe(2);
      expect(parseRating('star-rating Three')).toBe(3);
      expect(parseRating('star-rating Four')).toBe(4);
      expect(parseRating('star-rating Five')).toBe(5);
    });

    test('returns null for missing or invalid rating string', () => {
      expect(parseRating('star-rating Zero')).toBeNull();
      expect(parseRating('')).toBeNull();
      expect(parseRating(null)).toBeNull();
    });
  });

  describe('parseAvailability()', () => {
    test('identifies in stock availability correctly', () => {
      expect(parseAvailability('\n In stock \n')).toBe(true);
      expect(parseAvailability('Available (In stock)')).toBe(true);
      expect(parseAvailability('Out of stock')).toBe(false);
      expect(parseAvailability('')).toBe(false);
    });
  });

  describe('parseBookListing()', () => {
    test('extracts 5 book items cleanly from sample-page.html fixture', () => {
      const sampleHtml = fs.readFileSync(path.join(__dirname, '../fixtures/sample-page.html'), 'utf-8');
      const { books, errors } = parseBookListing(sampleHtml, 'http://books.toscrape.com/catalogue/page-1.html');

      expect(errors).toHaveLength(0);
      expect(books).toHaveLength(5);

      const firstBook = books[0];
      expect(firstBook.id).toBe('a-light-in-the-attic_1000');
      expect(firstBook.title).toBe('A Light in the Attic');
      expect(firstBook.price).toBe(51.77);
      expect(firstBook.currency).toBe('GBP');
      expect(firstBook.rating).toBe(3);
      expect(firstBook.inStock).toBe(true);
      expect(firstBook.url).toBe('http://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html');
    });

    test('survives broken-page.html fixture without crashing', () => {
      const brokenHtml = fs.readFileSync(path.join(__dirname, '../fixtures/broken-page.html'), 'utf-8');
      const { books, errors } = parseBookListing(brokenHtml, 'http://books.toscrape.com/catalogue/page-1.html');

      expect(books).toHaveLength(3);
      expect(errors).toHaveLength(0); // Item parsing didn't throw an unhandled exception
      expect(books[0].price).toBe(19.99); // Valid
      expect(books[1].price).toBeNull(); // Missing price
      expect(books[2].price).toBeNull(); // Invalid price string
    });
  });
});
