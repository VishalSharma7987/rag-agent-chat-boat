# 🤖 RAG Agent Demo

A **production-ready Retrieval-Augmented Generation (RAG)** backend API built with:

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| Embeddings | HuggingFace (`sentence-transformers/all-MiniLM-L6-v2`) |
| Vector DB | Pinecone |
| LLM | Groq (`llama3-8b-8192`) |
| Chunking | LangChain `RecursiveCharacterTextSplitter` |
| Caching | `node-cache` (in-memory) |
| Logging | Winston (console + file rotation) |

---

## 📁 Project Structure

```
/src
  /config          → Centralized env config with fail-fast validation
  /middleware      → Upload (multer) + global error handler
  /routes          → upload.js, chat.js, health.js
  /services
    cacheService.js      → In-memory TTL cache
    embeddingService.js  → HuggingFace embeddings (batched + cached)
    ingestionService.js  → PDF → chunk → embed → Pinecone pipeline
    llmService.js        → Groq LLM with strict grounded prompt
    pineconeService.js   → Upsert, similarity search, dedup
    retrievalService.js  → Query → embed → retrieve → context assembly
  /utils
    helpers.js     → Hash, retry, timeout, batching, confidence
    logger.js      → Winston logger (console + files)
  server.js        → Express app bootstrap & startup
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## 📡 API Reference

### `POST /upload`
Upload a PDF and index it in Pinecone.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF file (max 50MB) |

**Response:**
```json
{
  "success": true,
  "message": "PDF uploaded and indexed successfully",
  "data": {
    "source": "document.pdf",
    "chunks": 42,
    "skipped": 0,
    "duplicate": false
  }
}
```

---

### `POST /chat`
Ask a question — get a document-grounded answer.

**Request:**
```json
{ "question": "What is the refund policy?" }
```

**Response:**
```json
{
  "success": true,
  "answer": "The refund policy allows returns within 30 days...",
  "source": "policy.pdf",
  "confidence": "high",
  "metadata": {
    "chunksUsed": 3,
    "sources": ["policy.pdf"],
    "topScore": 0.8921
  }
}
```

---

### `GET /health`
System health check with Pinecone stats and cache metrics.

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HUGGINGFACE_API_KEY` | required | HF API key for embeddings |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `PINECONE_API_KEY` | required | Pinecone API key |
| `PINECONE_INDEX_NAME` | required | Pinecone index name |
| `PINECONE_NAMESPACE` | `default` | Pinecone namespace |
| `GROQ_API_KEY` | required | Groq API key |
| `GROQ_MODEL` | `llama3-8b-8192` | Groq model ID |
| `CHUNK_SIZE` | `1000` | Characters per chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `TOP_K` | `5` | Pinecone results count |
| `CACHE_TTL` | `300` | Cache TTL (seconds) |
| `UPLOAD_LIMIT_MB` | `50` | Max PDF file size |

---

## ⚠️ Pinecone Index Setup

> **IMPORTANT:** Your Pinecone index **must be created with `dimension: 384`**
> to match the `all-MiniLM-L6-v2` embedding model output.

Create the index in the Pinecone Console:
- **Dimensions:** `384`
- **Metric:** `cosine`
- **Index name:** `rag-agent-demo`

---

## 🛡️ Features

- ✅ **Duplicate detection** — file hash + Pinecone ID check
- ✅ **Retry logic** — 2 retries with exponential backoff for Pinecone + Groq
- ✅ **Timeout handling** — per-service configurable timeouts
- ✅ **In-memory caching** — embeddings + chat answers
- ✅ **Rate limiting** — separate limits for /upload and /chat
- ✅ **Graceful shutdown** — SIGTERM/SIGINT handled cleanly
- ✅ **Structured JSON responses** — every endpoint returns `{ answer, source, confidence }`
- ✅ **Confidence scoring** — based on Pinecone similarity scores
- ✅ **Fallback responses** — no results / LLM failure / parse failure
