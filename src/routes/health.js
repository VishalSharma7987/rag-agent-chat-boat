'use strict';

const express = require('express');
const router = express.Router();
const { describeIndex } = require('../services/pineconeService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * GET /health
 *
 * Health check endpoint.
 * Returns server status, cache stats, and Pinecone index info.
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    // Quick Pinecone connectivity check
    const indexStats = await describeIndex();

    const responseTime = Date.now() - startTime;
    const cacheStats = cacheService.stats();

    logger.info('[Route /health] Health check passed');

    return res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      services: {
        pinecone: {
          status: 'connected',
          totalVectorCount: indexStats.totalRecordCount || 0,
          dimension: indexStats.dimension || null,
        },
        cache: {
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          keys: cacheStats.keys,
        },
        llm: { provider: 'Groq', model: process.env.GROQ_MODEL || 'llama3-8b-8192' },
        embeddings: {
          provider: 'HuggingFace',
          model: process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
        },
      },
    });
  } catch (err) {
    logger.error(`[Route /health] Health check failed: ${err.message}`);

    return res.status(503).json({
      success: false,
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

module.exports = router;
