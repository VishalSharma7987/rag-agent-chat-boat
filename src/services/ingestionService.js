'use strict';

const pdfParse = require('pdf-parse');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { generateEmbeddings } = require('./embeddingService');
const { upsertVectors, fetchExistingIds } = require('./pineconeService');
const { generateHash, sanitizeFilename } = require('../utils/helpers');
const cacheService = require('./cacheService');
const documentService = require('./documentService');

/**
 * Ingestion Service
 *
 * Orchestrates the full PDF → Pinecone pipeline:
 *   1. Parse PDF
 *   2. Split into chunks
 *   3. Generate embeddings (HuggingFace)
 *   4. Deduplicate (skip already-indexed vectors)
 *   5. Upsert into Pinecone
 */

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: config.chunking.chunkSize,
  chunkOverlap: config.chunking.chunkOverlap,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

/**
 * Parses raw PDF buffer and extracts text.
 * Throws descriptive errors on empty or corrupt PDFs.
 *
 * @param {Buffer} pdfBuffer
 * @param {string} filename
 * @returns {Promise<string>}
 */
async function parsePDF(pdfBuffer, filename) {
  logger.info(`[Ingestion] Parsing PDF: ${filename}`);

  let parsed;
  try {
    parsed = await pdfParse(pdfBuffer);
  } catch (err) {
    throw new Error(`[Ingestion] PDF parsing failed for "${filename}": ${err.message}`);
  }

  const text = (parsed.text || '').trim();

  if (!text || text.length < 10) {
    throw new Error(`[Ingestion] PDF "${filename}" appears to be empty or contains no extractable text`);
  }

  logger.info(`[Ingestion] Extracted ${text.length} characters from "${filename}" (${parsed.numpages} page(s))`);
  return text;
}

/**
 * Splits extracted text into overlapping chunks.
 *
 * @param {string} text
 * @param {string} filename
 * @returns {Promise<string[]>}
 */
async function splitIntoChunks(text, filename) {
  logger.info(`[Ingestion] Splitting text into chunks (size=${config.chunking.chunkSize}, overlap=${config.chunking.chunkOverlap})`);

  const docs = await textSplitter.createDocuments([text]);
  const chunks = docs.map((doc) => doc.pageContent);

  if (chunks.length === 0) {
    throw new Error(`[Ingestion] No chunks produced from "${filename}"`);
  }

  logger.info(`[Ingestion] ✅ ${chunks.length} chunk(s) created from "${filename}"`);
  return chunks;
}

/**
 * Main ingestion pipeline — processes a PDF file buffer end-to-end.
 *
 * @param {Buffer} fileBuffer - raw PDF buffer
 * @param {string} originalFilename - original file name
 * @returns {Promise<{ message: string, chunks: number, skipped: number, source: string }>}
 */
async function ingestPDF(fileBuffer, originalFilename) {
  const safeFilename = sanitizeFilename(originalFilename);
  const fileHash = generateHash(fileBuffer);

  logger.info(`[Ingestion] ──────────────────────────────────────`);
  logger.info(`[Ingestion] Upload started: "${safeFilename}" (hash: ${fileHash})`);

  // ── Step 0: Duplicate file detection (cache-based) ──────────────
  const fileCacheKey = `file:${fileHash}`;
  if (cacheService.has(fileCacheKey)) {
    logger.info(`[Ingestion] ⚠️  Duplicate detected — "${safeFilename}" already processed (cached)`);
    documentService.addFile(safeFilename);
    return {
      message: 'File already processed (duplicate upload skipped)',
      chunks: 0,
      skipped: 0,
      source: safeFilename,
      duplicate: true,
    };
  }

  // ── Step 1: Parse PDF ────────────────────────────────────────────
  const text = await parsePDF(fileBuffer, safeFilename);

  // ── Step 2: Split into chunks ────────────────────────────────────
  const chunks = await splitIntoChunks(text, safeFilename);

  // ── Step 3: Build vector IDs (deterministic = supports dedup) ───
  const vectorRecords = chunks.map((chunk, idx) => {
    const chunkHash = crypto
      .createHash('md5')
      .update(`${fileHash}:${idx}:${chunk.substring(0, 100)}`)
      .digest('hex');
    return {
      id: `${safeFilename}__${chunkHash}`,
      chunk,
      idx,
    };
  });

  const vectorIds = vectorRecords.map((r) => r.id);

  // ── Step 4: Check Pinecone for existing vectors ──────────────────
  // Check a sample of IDs (first + last) to detect partial re-uploads
  const sampleIds = [vectorIds[0], vectorIds[vectorIds.length - 1]].filter(Boolean);
  const existingIds = await fetchExistingIds(sampleIds);

  if (existingIds.size === sampleIds.length && sampleIds.length > 0) {
    logger.info(`[Ingestion] ⚠️  All sampled vectors already exist in Pinecone — skipping upsert`);
    cacheService.set(fileCacheKey, true);
    documentService.addFile(safeFilename);
    return {
      message: 'File already indexed in Pinecone (duplicate upload skipped)',
      chunks: chunks.length,
      skipped: chunks.length,
      source: safeFilename,
      duplicate: true,
    };
  }

  // ── Step 5: Generate embeddings ──────────────────────────────────
  logger.info(`[Ingestion] Generating embeddings for ${chunks.length} chunks...`);
  const embeddings = await generateEmbeddings(chunks);
  logger.info(`[Ingestion] ✅ Embeddings created for ${embeddings.length} chunks`);

  // ── Step 6: Build Pinecone vector objects ────────────────────────
  const vectors = vectorRecords.map((record, idx) => ({
    id: record.id,
    values: embeddings[idx],
    metadata: {
      text: record.chunk,
      source: safeFilename,
      chunkIndex: record.idx,
      fileHash,
    },
  }));

  // ── Step 7: Upsert into Pinecone ─────────────────────────────────
  await upsertVectors(vectors);
  logger.info(`[Ingestion] ✅ Pinecone upsert success — ${vectors.length} vectors stored`);

  // ── Step 8: Mark file as processed in cache & track file ─────────
  cacheService.set(fileCacheKey, true);
  documentService.addFile(safeFilename);

  logger.info(`[Ingestion] ✅ Ingestion complete for "${safeFilename}"`);
  logger.info(`[Ingestion] ──────────────────────────────────────`);

  return {
    message: 'PDF uploaded and indexed successfully',
    chunks: chunks.length,
    skipped: 0,
    source: safeFilename,
    duplicate: false,
  };
}

module.exports = { ingestPDF };
