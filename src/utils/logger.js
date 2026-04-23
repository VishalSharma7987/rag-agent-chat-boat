'use strict';

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}${metaStr}`;
});

// Check environment
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// Base logger config
const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Always use console (Vercel friendly)
    new transports.Console({
      format: combine(
        colorize({ all: !isProduction }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
  ],
});

// OPTIONAL: Add file logging only in LOCAL (NOT Vercel)
if (!isVercel) {
  const path = require('path');
  const fs = require('fs');

  const logsDir = path.resolve(__dirname, '../../logs');

  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    logger.add(
      new transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
      })
    );

    logger.add(
      new transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
      })
    );
  } catch (err) {
    console.warn('File logging disabled:', err.message);
  }
}

module.exports = logger;