'use strict';

const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { ingestPDF } = require('../services/ingestionService');
const logger = require('../utils/logger');

/**
 * POST /upload
 *
 * Accepts a PDF file, processes it through the full ingestion pipeline,
 * and stores resulting vectors in Pinecone.
 *
 * Request: multipart/form-data with field name "file"
 * Response: { success, message, data: { source, chunks, skipped, duplicate } }
 */
router.post(
  '/',
  upload.single('file'),
  handleMulterError,
  async (req, res, next) => {
    try {
      // ── Validate file presence ───────────────────────────────────
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Please attach a PDF with field name "file".',
        });
      }

      const { originalname, buffer, size, mimetype } = req.file;
      logger.info(`[Route /upload] File received: "${originalname}" (${(size / 1024).toFixed(1)} KB, ${mimetype})`);

      // ── Run ingestion pipeline ───────────────────────────────────
      const result = await ingestPDF(buffer, originalname);

      // ── Respond ──────────────────────────────────────────────────
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          source: result.source,
          chunks: result.chunks,
          skipped: result.skipped,
          duplicate: result.duplicate,
        },
      });
    } catch (err) {
      logger.error(`[Route /upload] Error: ${err.message}`);

      // Specific user-friendly error cases
      if (err.message.includes('empty') || err.message.includes('no extractable text')) {
        return res.status(422).json({
          success: false,
          error: 'PDF appears to be empty or has no extractable text. Please upload a text-based PDF.',
        });
      }

      if (err.message.includes('PDF parsing failed')) {
        return res.status(422).json({
          success: false,
          error: 'Failed to parse the PDF. File may be corrupt or password-protected.',
        });
      }

      // Pass all other errors to global error handler
      next(err);
    }
  }
);

module.exports = router;
