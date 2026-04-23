'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Centralized configuration — all env vars validated here.
 * The app will fail fast on startup if required keys are missing.
 */

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key, defaultValue) {
  return process.env[key] || defaultValue;
}

const config = {
  server: {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    uploadLimitMb: parseInt(optionalEnv('UPLOAD_LIMIT_MB', '50'), 10),
  },

  huggingface: {
    apiKey: requireEnv('HUGGINGFACE_API_KEY'),
    embeddingModel: optionalEnv(
      'EMBEDDING_MODEL',
      'sentence-transformers/all-MiniLM-L6-v2'
    ),
  },

  pinecone: {
    apiKey: requireEnv('PINECONE_API_KEY'),
    indexName: requireEnv('PINECONE_INDEX_NAME'),
    namespace: optionalEnv('PINECONE_NAMESPACE', 'default'),
  },

  groq: {
    apiKey: requireEnv('GROQ_API_KEY'),
    model: optionalEnv('GROQ_MODEL', 'llama3-8b-8192'),
  },

  openrouter: {
    apiKey: optionalEnv('OPENROUTER_API_KEY', ''),
    model: optionalEnv('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
  },

  chunking: {
    chunkSize: parseInt(optionalEnv('CHUNK_SIZE', '1000'), 10),
    chunkOverlap: parseInt(optionalEnv('CHUNK_OVERLAP', '150'), 10),
  },

  retrieval: {
    topK: parseInt(optionalEnv('TOP_K', '5'), 10),
  },

  cache: {
    ttl: parseInt(optionalEnv('CACHE_TTL', '300'), 10), // seconds
  },
};

module.exports = config;
