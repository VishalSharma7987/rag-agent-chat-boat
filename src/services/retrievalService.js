'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const { generateQueryEmbedding } = require('./embeddingService');
const { querySimilar } = require('./pineconeService');
const { calculateConfidence } = require('../utils/helpers');

/**
 * Retrieval Service
 *
 * Converts a user question into an embedding, searches Pinecone,
 * and returns ranked context chunks with metadata.
 */

/**
 * @typedef {Object} RetrievalResult
 * @property {string[]} chunks - extracted text chunks
 * @property {string[]} sources - source filenames
 * @property {number[]} scores - similarity scores
 * @property {string} context - joined context string for LLM
 * @property {'high'|'medium'|'low'} confidence
 */

/**
 * Retrieves the most relevant document chunks for a given query.
 *
 * @param {string} question - user question
 * @returns {Promise<RetrievalResult>}
 */
async function retrieveContext(question) {
  logger.info(`[Retrieval] ──────────────────────────────────────`);
  logger.info(`[Retrieval] Query received: "${question.substring(0, 100)}..."`);

  // ── Step 1: Embed the question ───────────────────────────────────
  const queryEmbedding = await generateQueryEmbedding(question);
  logger.info(`[Retrieval] Query embedding generated (dim: ${queryEmbedding.length})`);

  // ── Step 2: Search Pinecone ──────────────────────────────────────
  const matches = await querySimilar(queryEmbedding, config.retrieval.topK);
  logger.info(`[Retrieval] Pinecone returned ${matches.length} result(s)`);

  // ── Step 3: Handle empty results ─────────────────────────────────
  if (matches.length === 0) {
    logger.warn('[Retrieval] No matches found in Pinecone');
    return {
      chunks: [],
      sources: [],
      scores: [],
      context: '',
      confidence: 'low',
    };
  }

  // ── Step 4: Extract and deduplicate chunks ───────────────────────
  const seen = new Set();
  const chunks = [];
  const sources = [];
  const scores = [];

  for (const match of matches) {
    const text = (match.metadata.text || '').trim();
    const source = match.metadata.source || 'unknown';

    // Skip near-duplicate chunks (same first 80 chars)
    const dedupeKey = text.substring(0, 80);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    chunks.push(text);
    sources.push(source);
    scores.push(match.score);
  }

  // ── Step 5: Build context string ─────────────────────────────────
  const context = chunks
    .map((chunk, i) => `[Source: ${sources[i]}]\n${chunk}`)
    .join('\n\n---\n\n');

  const confidence = calculateConfidence(scores);

  logger.info(`[Retrieval] ✅ ${chunks.length} unique chunk(s) retrieved — confidence: ${confidence}`);
  logger.info(`[Retrieval] Sources: ${[...new Set(sources)].join(', ')}`);
  logger.info(`[Retrieval] ──────────────────────────────────────`);

  return { chunks, sources, scores, context, confidence };
}

module.exports = { retrieveContext };
