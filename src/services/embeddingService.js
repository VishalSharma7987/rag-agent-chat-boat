'use strict';

const { pipeline, env } = require('@xenova/transformers');
const config = require('../config');
const logger = require('../utils/logger');
const { batchArray } = require('../utils/helpers');
const cacheService = require('./cacheService');

// 🔥 NEW: Xenova local embedding implementation
// Ensure it uses local cache properly and avoids browser-specific settings
env.allowLocalModels = true; 
env.useBrowserCache = false; 

let extractorPipeline = null;

/**
 * 🔥 NEW: Xenova local embedding implementation
 * Initializes and returns the Xenova transformer pipeline (singleton).
 * Model: Xenova/all-MiniLM-L6-v2
 */
async function getModel() {
  if (extractorPipeline) return extractorPipeline;

  try {
    logger.info('[EmbeddingService] Loading local model (Xenova/all-MiniLM-L6-v2)...');
    // Initializes pipeline for feature-extraction using the lightweight all-MiniLM-L6-v2
    extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    logger.info('[EmbeddingService] Model loaded successfully');
    return extractorPipeline;
  } catch (error) {
    logger.error(`[EmbeddingService] Failed to load local model: ${error.message}`);
    throw new Error(`Model loading failed: ${error.message}`);
  }
}

/**
 * Generates embeddings for an array of text strings.
 * Process texts sequentially using the local model.
 * Results are cached by MD5 hash of the text.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) {
    throw new Error('[EmbeddingService] No texts provided for embedding');
  }

  logger.info(`[EmbeddingService] Generating embeddings for ${texts.length} text(s)`);

  const BATCH_SIZE = 5; // Reduced default batch size to be safer for local sequential runs
  const batches = batchArray(texts, BATCH_SIZE);
  const allEmbeddings = [];

  // Initialize/Load model at the start of generation
  const extractor = await getModel();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.debug(`[EmbeddingService] Processing batch ${i + 1}/${batches.length} (size: ${batch.length})`);

    // Build cache keys for this batch
    const cacheHits = [];
    const misses = [];
    const missIndices = [];

    for (let j = 0; j < batch.length; j++) {
      const key = `emb:${Buffer.from(batch[j]).toString('base64').substring(0, 64)}`;
      const cached = cacheService.get(key);
      if (cached) {
        cacheHits[j] = cached;
      } else {
        misses.push(batch[j]);
        missIndices.push(j);
      }
    }

    let fetchedEmbeddings = [];
    if (misses.length > 0) {
      // 🔥 NEW: Xenova local embedding implementation
      for (let k = 0; k < misses.length; k++) {
        const text = misses[k];
        logger.debug(`[EmbeddingService] Processing text ${k + 1}/${misses.length}`);
        
        try {
          // feature-extraction automatically returns [1, 384] tensor when pooling is configured
          const output = await extractor(text, { pooling: 'mean', normalize: true });
          
          // Convert Xenova Tensor Float32Array down to standard JavaScript Array of numbers
          const embeddingVector = Array.from(output.data);
          fetchedEmbeddings.push(embeddingVector);
          logger.debug('[EmbeddingService] Embedding completed');
        } catch (err) {
          logger.error(`[EmbeddingService] Failed to embed text: ${err.message}`);
          throw new Error('Local embedding generation failed');
        }
      }

      // Cache the newly fetched embeddings
      misses.forEach((text, idx) => {
        const key = `emb:${Buffer.from(text).toString('base64').substring(0, 64)}`;
        cacheService.set(key, fetchedEmbeddings[idx]);
      });
    }

    // Merge hits and fetched into correct order
    const batchResult = new Array(batch.length);
    let fetchIdx = 0;
    for (let j = 0; j < batch.length; j++) {
      if (cacheHits[j]) {
        batchResult[j] = cacheHits[j];
      } else {
        batchResult[j] = fetchedEmbeddings[fetchIdx++];
      }
    }

    allEmbeddings.push(...batchResult);
  }

  logger.info(`[EmbeddingService] ✅ Embeddings created for ${allEmbeddings.length} chunk(s)`);
  return allEmbeddings;
}

/**
 * Generates a single embedding for a query string.
 * Uses caching to avoid redundant API calls.
 *
 * @param {string} text
 * @returns {Promise<number[]>} single embedding vector
 */
async function generateQueryEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('[EmbeddingService] Invalid query text');
  }

  const cacheKey = `qemb:${Buffer.from(text).toString('base64').substring(0, 64)}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.debug('[EmbeddingService] Query embedding served from cache');
    return cached;
  }

  logger.info('[EmbeddingService] Generating query embedding');

  // 🔥 NEW: Xenova local embedding implementation
  const extractor = await getModel();
  
  try {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);

    cacheService.set(cacheKey, embedding);
    return embedding;
  } catch (err) {
    logger.error(`[EmbeddingService] Failed to embed query: ${err.message}`);
    throw new Error('Local query embedding generation failed');
  }
}

module.exports = { generateEmbeddings, generateQueryEmbedding };
