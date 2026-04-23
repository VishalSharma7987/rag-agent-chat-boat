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

// ── Routes ──────────────────────────────────────────
const uploadRoute = require('./routes/upload');
const chatRoute = require('./routes/chat');
const healthRoute = require('./routes/health');
const filesRoute = require('./routes/files');

// ════════════════════════════════════════════════════
//  App Bootstrap
// ════════════════════════════════════════════════════
const app = express();

// 🔥 IMPORTANT FIX (Vercel proxy support)
app.set('trust proxy', true);

// ── Security headers ────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────
app.use(
  cors({
    origin: config.server.nodeEnv === 'production' ? false : '*',
    methods: ['GET', 'POST', 'DELETE'],
  })
);

// ── Logging ─────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === '/health',
  })
);

// ── Body parsers ────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global rate limiter ─────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // 🔥 FIX
  message: {
    success: false,
    error: 'Too many requests. Please wait before retrying.',
  },
});
app.use(globalLimiter);

// ── Chat limiter ────────────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // 🔥 FIX
  message: {
    success: false,
    error: 'Chat rate limit exceeded. Please wait a moment.',
  },
});

// ── Upload limiter ──────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // 🔥 FIX
  message: {
    success: false,
    error: 'Upload rate limit exceeded. Please wait before uploading again.',
  },
});

// ════════════════════════════════════════════════════
//  Routes
// ════════════════════════════════════════════════════
app.use('/health', healthRoute);
app.use('/upload', uploadLimiter, uploadRoute);
app.use('/chat', chatLimiter, chatRoute);
app.use('/files', filesRoute);

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'RAG Agent API',
    version: '1.0.0',
    description: 'Production-ready RAG system',
  });
});

// ── Error handlers ──────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ════════════════════════════════════════════════════
//  Start Server
// ════════════════════════════════════════════════════
const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// ── Shutdown ────────────────────────────────────────
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

module.exports = app;