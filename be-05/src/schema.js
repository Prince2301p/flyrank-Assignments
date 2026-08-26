const { z } = require('zod');

/**
 * Zod Schema definition for a single scraped book record
 */
const BookSchema = z.object({
  id: z.string().min(1, 'Book ID cannot be empty'),
  title: z.string().min(1, 'Book title cannot be empty'),
  price: z.number({
    required_error: 'Price is required',
    invalid_type_error: 'Price must be a number'
  }).positive('Price must be a positive number'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  inStock: z.boolean(),
  url: z.string().url('Book URL must be a valid URL'),
  imageUrl: z.string().url('Image URL must be a valid URL')
});

/**
 * Validates an array of extracted book objects against BookSchema
 * @param {Array<object>} rawBooks 
 * @returns {{ validBooks: Array<object>, invalidBooks: Array<{ record: object, errors: Array<string> }> }}
 */
function validateBooks(rawBooks) {
  const validBooks = [];
  const invalidBooks = [];

  if (!Array.isArray(rawBooks)) {
    return { validBooks, invalidBooks };
  }

  for (const rawBook of rawBooks) {
    const result = BookSchema.safeParse(rawBook);
    if (result.success) {
      validBooks.push(result.data);
    } else {
      const errorMessages = result.error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      invalidBooks.push({
        record: rawBook,
        errors: errorMessages
      });
    }
  }

  return { validBooks, invalidBooks };
}

module.exports = {
  BookSchema,
  validateBooks
};
