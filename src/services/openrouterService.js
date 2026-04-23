'use strict';

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

// 🔥 NEW: OpenRouter fallback implementation

/**
 * System prompt — enforces grounded, document-only answers.
 * Kept identical to the primary Groq service logic.
 */
const SYSTEM_PROMPT = `
You are a professional and polite company assistant.

YOUR ROLE:
- Help users by answering questions using the provided document context.
- Communicate clearly, naturally, and in a human-friendly tone.

BEHAVIOR RULES:

1. If the user greets (e.g., "hi", "hello", "hey"):
   - Respond politely and ask how you can help.
   - Example: "Hello! How can I assist you today?"

2. If the question is related to the document:
   - Answer ONLY using the provided context.
   - Keep the answer clear, structured, and professional.
   - Use bullet points if needed.

3. If the answer is NOT found in the document:
   - Do NOT say "Not available in documents."
   - Instead respond politely like:
     "I couldn’t find this information in the available documents. However, I’d be happy to help if you can provide more details or clarify your question."

4. NEVER make up facts or use outside knowledge.

5. Tone:
   - Always polite, helpful, and slightly conversational
   - Avoid robotic or overly strict responses

6. Formatting:
   - Use clean paragraphs or bullet points
   - Avoid raw JSON or technical formatting

7. Source (optional):
   - If answer is found, you may softly mention:
     "According to the company document..."

GOAL:
Provide helpful, professional, and human-like responses while staying grounded in the document.
`;

function buildUserMessage(question, context) {
  return `DOCUMENT CONTEXT:
──────────────────────────────
${context}
──────────────────────────────

USER QUESTION: ${question}

Please answer based ONLY on the document context above.`;
}

/**
 * OpenRouter Service
 * Fallback service if Groq fails.
 */
async function generateAnswerOpenRouter(question, context) {
  logger.info(`[LLM] Switching to OpenRouter...`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(question, context) },
  ];

  const payload = {
    model: config.openrouter.model,
    messages: messages,
    temperature: 0.1,
    max_tokens: 1024,
    top_p: 0.9,
  };

  const headers = {
    'Authorization': `Bearer ${config.openrouter.apiKey}`,
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'RAG Agent Demo',
    'Content-Type': 'application/json'
  };

  for (let i = 0; i < 2; i++) {
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers, timeout: 30000 });
      const answer = response.data?.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        throw new Error('OpenRouter returned empty response');
      }

      logger.info('[LLM] OpenRouter success');
      return answer;
    } catch (err) {
      if (i < 1) { // Will run once for the retry delay
        logger.info(`[LLM] OpenRouter failed, retrying...`);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw new Error(`OpenRouter LLM completion failed: ${err.message}`);
      }
    }
  }
}

module.exports = { generateAnswerOpenRouter };
