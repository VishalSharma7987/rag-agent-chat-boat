'use strict';

const { Pinecone } = require('@pinecone-database/pinecone');
const config = require('../config');
const logger = require('../utils/logger');
const { withRetry, withTimeout } = require('../utils/helpers');

/**
 * Pinecone Service
 * Handles all interactions with the Pinecone vector database:
 * - Client initialization
 * - Vector upsert (store)
 * - Similarity search (query)
 * - Duplicate detection by vector ID
 */

let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initializes and returns the Pinecone index (singleton).
 * @returns {Promise<import('@pinecone-database/pinecone').Index>}
 */
async function getPineconeIndex() {
  if (pineconeIndex) return pineconeIndex;

  logger.info('[PineconeService] Initializing Pinecone client...');

  pineconeClient = new Pinecone({
    apiKey: config.pinecone.apiKey,
  });

  pineconeIndex = pineconeClient.index(config.pinecone.indexName);

  logger.info(`[PineconeService] ✅ Connected to index: ${config.pinecone.indexName}`);
  return pineconeIndex;
}

/**
 * Upserts vectors into Pinecone in batches of 100.
 * Each record: { id, values, metadata }
 *
 * @param {Array<{ id: string, values: number[], metadata: object }>} vectors
 * @returns {Promise<void>}
 */
async function upsertVectors(vectors) {
  if (!vectors || vectors.length === 0) {
    throw new Error('[PineconeService] No vectors to upsert');
  }

  const index = await getPineconeIndex();
  const UPSERT_BATCH_SIZE = 100;

  logger.info(`[PineconeService] Upserting ${vectors.length} vectors into namespace: "${config.pinecone.namespace}"`);

  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
    const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vectors.length / UPSERT_BATCH_SIZE);

    await withRetry(
      () =>
        withTimeout(
          index.namespace(config.pinecone.namespace).upsert(batch),
          30000,
          `Pinecone upsert batch ${batchNum}`
        ),
      2,
      1000,
      `Pinecone upsert batch ${batchNum}/${totalBatches}`
    );

    logger.info(`[PineconeService] ✅ Upserted batch ${batchNum}/${totalBatches}`);
  }

  logger.info(`[PineconeService] ✅ Pinecone upsert complete — ${vectors.length} vectors stored`);
}

/**
 * Queries Pinecone for the most similar vectors to the given embedding.
 *
 * @param {number[]} queryEmbedding - query vector
 * @param {number} topK - number of results to retrieve
 * @returns {Promise<Array<{ id: string, score: number, metadata: object }>>}
 */
async function querySimilar(queryEmbedding, topK = config.retrieval.topK) {
  const index = await getPineconeIndex();

  logger.info(`[PineconeService] Querying Pinecone (topK=${topK}, namespace="${config.pinecone.namespace}")`);

  const result = await withRetry(
    () =>
      withTimeout(
        index.namespace(config.pinecone.namespace).query({
          vector: queryEmbedding,
          topK,
          includeMetadata: true,
        }),
        15000,
        'Pinecone similarity query'
      ),
    2,
    1000,
    'Pinecone similarity query'
  );

  const matches = result.matches || [];
  logger.info(`[PineconeService] Query returned ${matches.length} match(es)`);

  return matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata || {},
  }));
}

/**
 * Checks whether vectors with the given IDs already exist in Pinecone.
 * Used for duplicate upload detection.
 *
 * @param {string[]} ids
 * @returns {Promise<Set<string>>} Set of existing IDs
 */
async function fetchExistingIds(ids) {
  if (!ids || ids.length === 0) return new Set();

  const index = await getPineconeIndex();

  try {
    const result = await withTimeout(
      index.namespace(config.pinecone.namespace).fetch(ids),
      10000,
      'Pinecone fetch IDs'
    );

    const existingIds = new Set(Object.keys(result.records || {}));
    logger.debug(`[PineconeService] Found ${existingIds.size} existing vector ID(s)`);
    return existingIds;
  } catch (err) {
    logger.warn(`[PineconeService] Could not fetch existing IDs: ${err.message}. Proceeding without dedup.`);
    return new Set();
  }
}

/**
 * Describes the Pinecone index stats (dimension, vector count, etc.)
 * Useful for health checks.
 *
 * @returns {Promise<object>}
 */
async function describeIndex() {
  const index = await getPineconeIndex();
  return await index.describeIndexStats();
}

/**
 * Deletes vectors matching the specified metadata filter.
 *
 * @param {object} metadataFilter
 * @returns {Promise<void>}
 */
async function deleteByMetadata(metadataFilter) {
  const index = await getPineconeIndex();
  logger.info(`[PineconeService] Deleting vectors by metadata: ${JSON.stringify(metadataFilter)}`);
  await index.namespace(config.pinecone.namespace).deleteMany(metadataFilter);
}

/**
 * Deletes all vectors in the active namespace.
 *
 * @returns {Promise<void>}
 */
async function deleteAll() {
  const index = await getPineconeIndex();
  logger.info(`[PineconeService] Deleting all vectors in namespace: "${config.pinecone.namespace}"`);
  await index.namespace(config.pinecone.namespace).deleteAll();
}

module.exports = {
  getPineconeIndex,
  upsertVectors,
  querySimilar,
  fetchExistingIds,
  describeIndex,
  deleteByMetadata,
  deleteAll,
};
