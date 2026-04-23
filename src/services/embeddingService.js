'use strict';

let pipeline, env; // 🔥 dynamic load ke liye

const config = require('../config');
const logger = require('../utils/logger');
const { batchArray } = require('../utils/helpers');
const cacheService = require('./cacheService');

let extractorPipeline = null;

// 🔥 FIX: Dynamic import for ESM
async function loadTransformers() {
  if (!pipeline) {
    const module = await import('@xenova/transformers');
    pipeline = module.pipeline;
    env = module.env;

    // same config as before
    env.allowLocalModels = true;
    env.useBrowserCache = false;
  }
}

/**
 * Model loader (same logic as before)
 */
async function getModel() {
  if (extractorPipeline) return extractorPipeline;

  try {
    await loadTransformers(); // 🔥 FIX HERE

    logger.info('[EmbeddingService] Loading local model (Xenova/all-MiniLM-L6-v2)...');

    extractorPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    logger.info('[EmbeddingService] Model loaded successfully');
    return extractorPipeline;

  } catch (error) {
    logger.error(`[EmbeddingService] Failed to load local model: ${error.message}`);
    throw new Error(`Model loading failed: ${error.message}`);
  }
}

/**
 * Generate embeddings (NO CHANGE)
 */
async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) {
    throw new Error('[EmbeddingService] No texts provided for embedding');
  }

  logger.info(`[EmbeddingService] Generating embeddings for ${texts.length} text(s)`);

  const BATCH_SIZE = 5;
  const batches = batchArray(texts, BATCH_SIZE);
  const allEmbeddings = [];

  const extractor = await getModel();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const cacheHits = [];
    const misses = [];

    for (let j = 0; j < batch.length; j++) {
      const key = `emb:${Buffer.from(batch[j]).toString('base64').substring(0, 64)}`;
      const cached = cacheService.get(key);

      if (cached) {
        cacheHits[j] = cached;
      } else {
        misses.push(batch[j]);
      }
    }

    let fetchedEmbeddings = [];

    for (let text of misses) {
      try {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        fetchedEmbeddings.push(Array.from(output.data));
      } catch (err) {
        logger.error(`[EmbeddingService] Failed to embed text: ${err.message}`);
        throw new Error('Local embedding generation failed');
      }
    }

    misses.forEach((text, idx) => {
      const key = `emb:${Buffer.from(text).toString('base64').substring(0, 64)}`;
      cacheService.set(key, fetchedEmbeddings[idx]);
    });

    const batchResult = [];
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

  logger.info(`[EmbeddingService] ✅ Embeddings created for ${allEmbeddings.length}`);
  return allEmbeddings;
}

/**
 * Query embedding (NO CHANGE)
 */
async function generateQueryEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('[EmbeddingService] Invalid query text');
  }

  const cacheKey = `qemb:${Buffer.from(text).toString('base64').substring(0, 64)}`;
  const cached = cacheService.get(cacheKey);

  if (cached) return cached;

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

module.exports = {
  generateEmbeddings,
  generateQueryEmbedding,
};