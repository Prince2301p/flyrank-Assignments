const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Extracts numeric float price from raw currency string (e.g. "£51.77" -> 51.77)
 * @param {string} rawPrice 
 * @returns {number|null}
 */
function cleanPrice(rawPrice) {
  if (typeof rawPrice !== 'string') return null;
  // Match digits and decimal point
  const match = rawPrice.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Converts word-based star rating to integer 1-5 (e.g. "Three" -> 3)
 * @param {string} ratingStr 
 * @returns {number|null}
 */
function parseRating(ratingStr) {
  if (typeof ratingStr !== 'string') return null;

  const wordMap = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5
  };

  const words = ratingStr.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (wordMap[word] !== undefined) {
      return wordMap[word];
    }
  }

  return null;
}

/**
 * Parses stock availability text to boolean
 * @param {string} text 
 * @returns {boolean}
 */
function parseAvailability(text) {
  if (typeof text !== 'string') return false;
  return text.toLowerCase().includes('in stock');
}

/**
 * Resolves a relative URL against a base URL safely
 * @param {string} relativeUrl 
 * @param {string} baseUrl 
 * @returns {string}
 */
function resolveUrl(relativeUrl, baseUrl) {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (err) {
    return relativeUrl;
  }
}

/**
 * Parses HTML listing page and extracts book objects
 * Isolates per-item extraction errors so malformed HTML items do not crash the entire page parser.
 * 
 * @param {string} html 
 * @param {string} pageUrl 
 * @returns {{ books: Array<object>, errors: Array<object> }}
 */
function parseBookListing(html, pageUrl = 'http://books.toscrape.com/catalogue/page-1.html') {
  const books = [];
  const errors = [];

  if (!html || typeof html !== 'string') {
    return { books, errors: [{ message: 'Invalid or empty HTML string passed to parser' }] };
  }

  const $ = cheerio.load(html);
  const itemNodes = $('article.product_pod');

  itemNodes.each((index, element) => {
    try {
      const $el = $(element);

      // Title & Detail Link
      const $titleAnchor = $el.find('h3 a');
      const titleAttr = $titleAnchor.attr('title');
      const titleText = $titleAnchor.text().trim();
      const title = titleAttr ? titleAttr.trim() : titleText;

      const relativeHref = $titleAnchor.attr('href') || '';
      const url = resolveUrl(relativeHref, pageUrl);

      // Image URL
      const $img = $el.find('.image_container img');
      const relativeImgSrc = $img.attr('src') || '';
      const imageUrl = resolveUrl(relativeImgSrc, pageUrl);

      // Price
      const rawPrice = $el.find('.product_price .price_color').text().trim();
      const price = cleanPrice(rawPrice);

      // Rating
      const ratingClass = $el.find('.star-rating').attr('class') || '';
      const rating = parseRating(ratingClass);

      // Availability
      const availabilityText = $el.find('.product_price .instock.availability').text().trim();
      const inStock = parseAvailability(availabilityText);

      // Generate a consistent ID/slug
      const cleanHref = relativeHref.replace(/\/index\.html$/i, '').replace(/\/$/, '');
      const slug = cleanHref ? cleanHref.split('/').pop() : `book-${index + 1}`;

      const rawBook = {
        id: slug,
        title,
        price,
        rawPrice,
        currency: 'GBP',
        rating,
        inStock,
        url,
        imageUrl
      };

      books.push(rawBook);
    } catch (err) {
      errors.push({
        itemIndex: index,
        error: err.message
      });
    }
  });

  return { books, errors };
}

module.exports = {
  cleanPrice,
  parseRating,
  parseAvailability,
  resolveUrl,
  parseBookListing
};
