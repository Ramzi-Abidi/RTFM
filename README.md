# RTFM For Me

An AI-powered documentation assistant built with RAG (Retrieval Augmented Generation). Upload your documentation files, ask questions in natural language, and get accurate answers with source citations — powered entirely by free-tier APIs.

## UI preview (V1)
<img width="1512" height="844" alt="image" src="https://github.com/user-attachments/assets/0888b0c1-3195-4d73-832e-16b3323b0c4f" />

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS (TypeScript) |
| **Frontend** | React + Vite + TailwindCSS |
| **Vector DB / Cache / Storage** | Redis Stack |
| **LLM** | Groq (`llama-3.3-70b-versatile`) with Google AI (Gemini) fallback |
| **Embeddings** | Jina AI (`jina-embeddings-v3`, 1024 dimensions) |
| **Package Manager** | pnpm |

## How It Works

### Ingestion
1. Upload `.md` or `.txt` documentation files
2. Split content into chunks by markdown headers and word count
3. Generate 1024-dim embeddings via Jina AI
4. Store chunks + embeddings in Redis vector index (`idx:docs`)
5. Deduplicate via SHA-256 content hash

### Question Answering (RAG)
1. Embed the user question via Jina AI (`retrieval.query` task)
2. Check semantic cache (`idx:cache`) for a similar previously answered question
3. If cache miss — run KNN vector search to find top 5 relevant chunks
4. Build prompt with retrieved context and send to Groq LLM
5. Return answer with source file citations
6. Cache Q&A pair for future similar questions

## Quick Start

### 1. Get API Keys (All Free)

- [Groq](https://console.groq.com) — LLM (free tier: 14k requests/day)
- [Jina AI](https://jina.ai/embeddings) — Embeddings (free tier: 1M tokens)
- [Google AI Studio](https://aistudio.google.com) — Fallback LLM (free tier: 1M tokens/day)

### 2. Setup Environment

```bash
cd server
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Start Redis

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 4. Start Backend

```bash
cd server
pnpm install
pnpm run start:dev
```

### 5. Start Frontend

```bash
cd client
pnpm install
pnpm run dev
```

App runs at `http://localhost:5173`, backend at `http://localhost:3000`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest` | POST | Upload documentation files (multipart) |
| `/api/ask` | POST | Ask a question `{ question: string }` |
| `/api/documents` | GET | List all uploaded documents |
| `/api/documents/:id` | DELETE | Delete a document and its chunks |

## Redis Data Model

| Key Pattern | Type | Description |
|-------------|------|-------------|
| `file:<hash>` | Hash | Document metadata (fileName, chunks, createdAt) |
| `doc:<hash>:<i>` | Hash | Document chunk with embedding vector |
| `cache:<id>` | Hash | Cached Q&A pair with embedding vector |
| `idx:docs` | Index | Vector index for document chunk search |
| `idx:cache` | Index | Vector index for semantic cache lookup |

## License

MIT
