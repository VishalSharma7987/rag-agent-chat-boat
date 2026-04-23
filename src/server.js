'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ── Routes ──────────────────────────────────────────────────────────
const uploadRoute = require('./routes/upload');
const chatRoute = require('./routes/chat');
const healthRoute = require('./routes/health');
const filesRoute = require('./routes/files');

// ════════════════════════════════════════════════════
//  App Bootstrap
// ════════════════════════════════════════════════════
const app = express();

// ── Security headers ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.server.nodeEnv === 'production' ? false : '*',
    methods: ['GET', 'POST', 'DELETE'],
  })
);

// ── Request logging (HTTP) ───────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === '/health', // skip noisy health logs
  })
);

// ── Body parsers ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global rate limiter ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait before retrying.',
  },
});
app.use(globalLimiter);

// ── Stricter limiter for LLM-intensive /chat route ───────────────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 queries per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Chat rate limit exceeded. Please wait a moment.',
  },
});

// ── Upload rate limiter ───────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 uploads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Upload rate limit exceeded. Please wait before uploading again.',
  },
});

// ════════════════════════════════════════════════════
//  Route Registration
// ════════════════════════════════════════════════════
app.use('/health', healthRoute);
app.use('/upload', uploadLimiter, uploadRoute);
app.use('/chat', chatLimiter, chatRoute);
app.use('/files', filesRoute);

// Root welcome message
app.get('/', (req, res) => {
  res.json({
    name: 'RAG Agent API',
    version: '1.0.0',
    description: 'Production-ready RAG system: PDF ingestion + semantic Q&A',
    endpoints: {
      'POST /upload': 'Upload a PDF and index it in Pinecone',
      'POST /chat':   'Ask a question — get a document-grounded answer',
      'GET  /health': 'Service health check',
    },
  });
});

// ── 404 & Global Error Handlers (must be last) ───────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ════════════════════════════════════════════════════
//  Start Server
// ════════════════════════════════════════════════════
const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info('══════════════════════════════════════════════');
  logger.info(`  RAG Agent API — ${config.server.nodeEnv.toUpperCase()}`);
  logger.info(`  Listening on: http://localhost:${PORT}`);
  logger.info(`  Pinecone Index: ${config.pinecone.indexName}`);
  logger.info(`  Embedding Model: ${config.huggingface.embeddingModel}`);
  logger.info(`  LLM Model: ${config.groq.model}`);
  logger.info('══════════════════════════════════════════════');
});

// ── Graceful shutdown ─────────────────────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`[Server] ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('[Server] HTTP server closed. Exiting.');
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    logger.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Unhandled rejection safety net ───────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Rejection:', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught Exception:', { error: err.message });
  process.exit(1);
});

module.exports = app;
