'use strict';

const express = require('express');
const router = express.Router();
const { retrieveContext } = require('../services/retrievalService');
const { generateAnswer } = require('../services/llmService');
// 🔥 NEW: OpenRouter fallback implementation
const { generateAnswerOpenRouter } = require('../services/openrouterService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * POST /chat
 *
 * Accepts a user question, retrieves relevant document chunks from Pinecone,
 * generates a grounded answer using Groq, and returns a structured response.
 *
 * Request body: { "question": "string" }
 * Response:     { "answer": "...", "source": "...", "confidence": "high|medium|low" }
 */
router.post('/', async (req, res, next) => {
  try {
    const { question } = req.body;

    // Step 1: validate
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "question"',
      });
    }

    const trimmedQuestion = question.trim();
    const lowerQ = trimmedQuestion.toLowerCase();

    // Greeting handling
    if (lowerQ.startsWith('hi') || lowerQ.startsWith('hello') || lowerQ.startsWith('hey')) {
      return res.status(200).json({
        success: true,
        answer: 'Hello! How can I help you today?',
        source: 'system',
        confidence: 'high',
      });
    }

    // Empty check
    if (!trimmedQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a question.',
      });
    }

    // Length check
    if (trimmedQuestion.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Question exceeds maximum length of 2000 characters.',
      });
    }

    logger.info(`[Route /chat] Question received: "${trimmedQuestion.substring(0, 80)}..."`);

    // ── Check answer cache ───────────────────────────────────────────
    const cacheKey = `chat:${Buffer.from(trimmedQuestion.toLowerCase()).toString('base64').substring(0, 64)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.info('[Route /chat] ✅ Answer served from cache');
      return res.status(200).json({ ...cached, cached: true });
    }

    // ── Retrieve context from Pinecone ───────────────────────────────
    let { chunks, sources, scores, context, confidence } = await retrieveContext(trimmedQuestion);
    // ── Fallback: no relevant data found ────────────────────────────
    if (chunks.length === 0) {
      logger.warn('[Route /chat] No relevant chunks found — returning fallback response');
      return res.status(200).json({
        success: true,
        answer: 'No relevant data found in the uploaded documents for your question.',
        source: 'N/A',
        confidence: 'low',
      });
    }

    // ── Generate answer via Groq ─────────────────────────────────────
    let answer;
    try {
      answer = await generateAnswer(trimmedQuestion, context);
    } catch (llmErr) {
      // 🔥 NEW: OpenRouter fallback implementation
      try {
        answer = await generateAnswerOpenRouter(trimmedQuestion, context);
      } catch (openRouterErr) {
        logger.error(`[LLM] All providers failed, using fallback`);

        // Final fallback
        answer = context || "No answer available";
        confidence = 'low';
      }
    }

    // ── Build response ───────────────────────────────────────────────
    const uniqueSources = [...new Set(sources)];
    const responsePayload = {
      success: true,
      answer,
      source: uniqueSources.join(', '),
      confidence,
      metadata: {
        chunksUsed: chunks.length,
        sources: uniqueSources,
        topScore: scores[0] ? parseFloat(scores[0].toFixed(4)) : null,
      },
    };

    // ── Cache the answer ─────────────────────────────────────────────
    cacheService.set(cacheKey, responsePayload);

    logger.info(`[Route /chat] ✅ Response sent — confidence: ${confidence}, sources: ${uniqueSources.join(', ')}`);
    return res.status(200).json(responsePayload);

  } catch (err) {
    logger.error(`[Route /chat] Unhandled error: ${err.message}`);
    next(err);
  }
});

module.exports = router;
