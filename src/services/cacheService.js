'use strict';

const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * In-memory cache service using node-cache.
 * Used to cache: embedding vectors, query answers.
 * TTL is configurable via CACHE_TTL env var.
 */

const cache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: Math.floor(config.cache.ttl * 0.2), // cleanup every 20% of TTL
  useClones: false, // performance: don't deep-clone on get/set
});

cache.on('expired', (key) => {
  logger.debug(`[Cache] Key expired: ${key}`);
});

/**
 * Get a cached value.
 * @param {string} key
 * @returns {any|undefined}
 */
function get(key) {
  const value = cache.get(key);
  if (value !== undefined) {
    logger.debug(`[Cache] HIT — key: ${key}`);
  }
  return value;
}

/**
 * Set a cache value.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl] - optional override TTL in seconds
 */
function set(key, value, ttl) {
  if (ttl !== undefined) {
    cache.set(key, value, ttl);
  } else {
    cache.set(key, value);
  }
  logger.debug(`[Cache] SET — key: ${key}`);
}

/**
 * Delete a cache key.
 * @param {string} key
 */
function del(key) {
  cache.del(key);
  logger.debug(`[Cache] DEL — key: ${key}`);
}

/**
 * Check if a key exists in cache.
 * @param {string} key
 * @returns {boolean}
 */
function has(key) {
  return cache.has(key);
}

/**
 * Flush the entire cache.
 */
function flush() {
  cache.flushAll();
  logger.info('[Cache] Flushed all keys');
}

/**
 * Get cache statistics.
 */
function stats() {
  return cache.getStats();
}

module.exports = { get, set, del, has, flush, stats };
