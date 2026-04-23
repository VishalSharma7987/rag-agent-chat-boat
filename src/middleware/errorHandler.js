'use strict';

const logger = require('../utils/logger');

/**
 * Global error handler middleware.
 * Must be registered LAST in the Express middleware chain.
 *
 * Returns a consistent JSON error shape:
 * { success: false, error: string, ...(dev only: stack) }
 */
function errorHandler(err, req, res, next) {
  // Avoid double-sending if response already started
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const status = err.status || err.statusCode || 500;

  logger.error(`[ErrorHandler] ${req.method} ${req.path} → ${status}: ${err.message}`, {
    stack: isDev ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * 404 handler — catches all unmatched routes.
 */
function notFoundHandler(req, res) {
  logger.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
