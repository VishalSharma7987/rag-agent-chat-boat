'use strict';

const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generates an MD5 hash from a buffer or string.
 * Used to detect duplicate PDF uploads.
 * @param {Buffer|string} content
 * @returns {string} hex hash
 */
function generateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Retries an async function up to `maxRetries` times with exponential backoff.
 * @param {Function} fn - async function to retry
 * @param {number} maxRetries - max attempts (default: 2)
 * @param {number} delayMs - initial delay in ms (default: 1000)
 * @param {string} label - identifier for logging
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxRetries = 2, delayMs = 1000, label = 'operation') {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger.warn(`[Retry] ${label} failed on attempt ${attempt}/${maxRetries}: ${err.message}`);
      if (attempt < maxRetries) {
        await sleep(delayMs * attempt); // exponential backoff
      }
    }
  }
  throw lastError;
}

/**
 * Wraps a promise with a timeout.
 * @param {Promise} promise
 * @param {number} ms - timeout in milliseconds
 * @param {string} label - identifier for logging
 * @returns {Promise<any>}
 */
function withTimeout(promise, ms, label = 'operation') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`[Timeout] ${label} exceeded ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Splits an array into batches of the given size.
 * @param {Array} arr
 * @param {number} batchSize
 * @returns {Array[]}
 */
function batchArray(arr, batchSize) {
  const batches = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Sleep utility.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitizes a filename for safe use as a Pinecone metadata value.
 * @param {string} filename
 * @returns {string}
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}

/**
 * Determines confidence level based on Pinecone similarity scores.
 * @param {number[]} scores
 * @returns {'high'|'medium'|'low'}
 */
function calculateConfidence(scores) {
  if (!scores || scores.length === 0) return 'low';
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avgScore >= 0.75) return 'high';
  if (avgScore >= 0.5) return 'medium';
  return 'low';
}

module.exports = {
  generateHash,
  withRetry,
  withTimeout,
  batchArray,
  sleep,
  sanitizeFilename,
  calculateConfidence,
};
