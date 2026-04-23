'use strict';

const express = require('express');
const router = express.Router();
const documentService = require('../services/documentService');
const pineconeService = require('../services/pineconeService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// GET /files
router.get('/', (req, res) => {
  try {
    const files = documentService.getAllFiles();
    const count = documentService.getFileCount();
    return res.status(200).json({ success: true, count, files });
  } catch (err) {
    logger.error(`[Route /files] GET Error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Failed to retrieve files' });
  }
});

// DELETE /files/delete-file
router.delete('/delete-file', async (req, res) => {
  const { fileName } = req.body;

  if (!fileName) {
    return res.status(400).json({ success: false, error: 'fileName is required' });
  }

  try {
    logger.info(`[Route /files] Deleting file: ${fileName}`);

    // Delete from Pinecone by metadata filter.
    // A 404 from Pinecone means the namespace / vectors don't exist —
    // treat it as a no-op so stale registry entries can still be cleaned up.
    try {
      await pineconeService.deleteByMetadata({ source: fileName });
    } catch (pineconeErr) {
      const msg = pineconeErr.message || '';
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        logger.warn(`[Route /files] Pinecone namespace not found for "${fileName}" — skipping vector delete`);
      } else {
        throw pineconeErr; // rethrow unexpected errors
      }
    }

    // Always remove from JSON registry
    documentService.removeFile(fileName);

    // Clear cache so the AI uses only remaining PDFs
    cacheService.flush();

    return res.status(200).json({ success: true, message: `File "${fileName}" deleted successfully` });
  } catch (err) {
    logger.error(`[Route /files] DELETE file Error: ${err.message}`);
    return res.status(500).json({ success: false, error: `Failed to delete file: ${err.message}` });
  }
});

// POST /files/clear-all
router.post('/clear-all', async (req, res) => {
  try {
    logger.info(`[Route /files] Clearing all files and vectors`);

    // Delete all vectors in namespace.
    // A 404 from Pinecone means the namespace is already empty — treat as no-op.
    try {
      await pineconeService.deleteAll();
    } catch (pineconeErr) {
      const msg = pineconeErr.message || '';
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        logger.warn('[Route /files] Pinecone namespace not found — nothing to delete (already empty)');
      } else {
        throw pineconeErr; // rethrow unexpected errors
      }
    }

    // Always clear the JSON registry and cache
    documentService.clearAllFiles();
    cacheService.flush();

    return res.status(200).json({ success: true, message: 'All files and vectors cleared successfully' });
  } catch (err) {
    logger.error(`[Route /files] POST clear-all Error: ${err.message}`);
    return res.status(500).json({ success: false, error: `Failed to clear all files: ${err.message}` });
  }
});

module.exports = router;
