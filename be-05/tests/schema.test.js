const { BookSchema, validateBooks } = require('../src/schema');

describe('Schema Module Unit Tests', () => {
  const validBook = {
    id: 'test-book-1',
    title: 'Test Book Title',
    price: 29.99,
    currency: 'GBP',
    rating: 4,
    inStock: true,
    url: 'http://books.toscrape.com/catalogue/test-book-1/index.html',
    imageUrl: 'http://books.toscrape.com/media/cache/test.jpg'
  };

  test('valid book record passes BookSchema parse', () => {
    const parseResult = BookSchema.safeParse(validBook);
    expect(parseResult.success).toBe(true);
  });

  test('fails validation if price is missing or null', () => {
    const invalidPrice = { ...validBook, price: null };
    const parseResult = BookSchema.safeParse(invalidPrice);
    expect(parseResult.success).toBe(false);
  });

  test('fails validation if rating is out of range 1-5', () => {
    const invalidRatingHigh = { ...validBook, rating: 6 };
    const invalidRatingLow = { ...validBook, rating: 0 };
    expect(BookSchema.safeParse(invalidRatingHigh).success).toBe(false);
    expect(BookSchema.safeParse(invalidRatingLow).success).toBe(false);
  });

  test('fails validation if url is invalid', () => {
    const invalidUrl = { ...validBook, url: 'not-a-valid-url' };
    expect(BookSchema.safeParse(invalidUrl).success).toBe(false);
  });

  test('validateBooks partitions mixed raw records correctly', () => {
    const rawList = [
      validBook,
      { ...validBook, id: 'test-book-2', price: null }, // Invalid
      { ...validBook, id: 'test-book-3', title: 'Another Valid' }
    ];

    const { validBooks, invalidBooks } = validateBooks(rawList);

    expect(validBooks).toHaveLength(2);
    expect(invalidBooks).toHaveLength(1);
    expect(invalidBooks[0].record.id).toBe('test-book-2');
  });
});
