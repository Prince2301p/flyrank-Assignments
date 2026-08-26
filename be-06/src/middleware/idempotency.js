/**
 * Idempotency Middleware
 * Extracts Idempotency-Key or X-Idempotency-Key header from incoming request headers
 */

module.exports = function idempotencyMiddleware(req, res, next) {
  const headerKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  
  if (headerKey && typeof headerKey === 'string' && headerKey.trim().length > 0) {
    req.idempotencyKey = headerKey.trim();
  } else {
    req.idempotencyKey = null;
  }

  next();
};
