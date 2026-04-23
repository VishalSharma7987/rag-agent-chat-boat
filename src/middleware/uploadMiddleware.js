'use strict';

const multer = require('multer');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Multer configuration for PDF upload middleware.
 *
 * - Stores file in memory (no disk writes)
 * - Accepts only PDF files
 * - Enforces file size limit from config
 */

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE_BYTES = config.server.uploadLimitMb * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || ext !== '.pdf') {
    logger.warn(`[Upload] Rejected file: "${file.originalname}" (type: ${file.mimetype})`);
    return cb(
      new Error(`Only PDF files are accepted. Received: "${file.originalname}" (${file.mimetype})`),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // single file per request
  },
});

/**
 * Multer error handler middleware.
 * Must be used AFTER the multer middleware in the route chain.
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum allowed size is ${config.server.uploadLimitMb}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  next();
}

module.exports = { upload, handleMulterError };
