<p align="center">
  <img src="client/public/logo.svg" width="120" alt="RTFM logo" />
</p>

<h1 align="center">RTFM - Read The F*ing Manual for me</h1>

<p align="center">
  An AI-powered documentation assistant built with RAG. Upload your docs, ask questions in natural language, get answers with source citations, powered entirely by free-tier APIs.
</p>

---

<p align="center">
  <img src="https://github.com/user-attachments/assets/9160c30a-000b-4c46-b6d5-11fadffb57c2" width="800" alt="image" />
</p>

## Features

- **RAG pipeline**: ingest `.md` / `.txt`, chunk, embed, retrieve top-k, answer with citations
- **Semantic cache**: repeated / rephrased questions return instantly without hitting the LLM
- **Session memory**: conversation history persisted in Redis (24h TTL) for follow-up questions
- **Streaming answers**: token-by-token responses over Server-Sent Events (SSE)
- **Document preview**: click a file in the sidebar to view its full content in a modal
- **Dark mode**: class-based Tailwind theme, remembered across reloads
- **Mobile responsive**: chat-centric layout with slide-over drawers for documents and chats
- **Conversational routing**: greetings ("hi", "thanks") skip RAG and get a friendly reply

## Tech Stack

| Layer                           | Technology                                                   |
| ------------------------------- | ------------------------------------------------------------ |
| **Backend**                     | NestJS (TypeScript)                                          |
| **Frontend**                    | React + Vite + TailwindCSS                                   |
| **Vector DB / Cache / Storage** | Redis Stack                                                  |
| **LLM**                         | Groq (`openai/gpt-oss-20b`) with Google AI (Gemini) fallback |
| **Embeddings**                  | Jina AI (`jina-embeddings-v3`, 1024 dimensions)              |
| **Package Manager**             | pnpm                                                         |

## How It Works

### Ingestion

1. upload `.md` or `.txt` documentation files
2. split content into chunks by markdown headers and word count
3. generate 1024-dim embeddings via Jina AI
4. store chunks + embeddings in Redis vector index (`idx:docs`)
5. deduplicate via SHA-256 content hash

### Question Answering (RAG)

1. embed the user question via Jina AI (`retrieval.query` task)
2. route greetings / small talk to a conversational prompt (no RAG)
3. check semantic cache (`idx:cache`) for a similar previously answered question
4. if cache miss, run KNN vector search to find top 5 relevant chunks
5. build prompt with retrieved context + conversation history and stream from Groq
6. persist user + assistant messages to the session (`session:<id>`)
7. cache Q&A pair for future similar questions

### Streaming

The `/api/ask/stream` endpoint returns Server-Sent Events. Each frame is a JSON payload:

```
data: {"type":"sources","sources":[...]}
data: {"type":"token","value":"..."}
data: {"type":"done"}
```

Session and semantic cache writes happen only after the full answer is received.

## Quick Start

### 1. Get API Keys (All Free)

- [Groq](https://console.groq.com) : LLM (free tier: 14k requests/day)
- [Jina AI](https://jina.ai/embeddings) : Embeddings (free tier: 1M tokens)
- [Google AI Studio](https://aistudio.google.com) : Fallback LLM (free tier: 1M tokens/day)

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

### Ingest & Documents

| Endpoint             | Method | Description                                                     |
| -------------------- | ------ | --------------------------------------------------------------- |
| `/api/ingest`        | POST   | Upload documentation files (multipart form-data, field `files`) |
| `/api/documents`     | GET    | List all uploaded documents                                     |
| `/api/documents/:id` | GET    | Get a document's full content (for preview)                     |
| `/api/documents/:id` | DELETE | Delete a document and its chunks                                |

### Ask

| Endpoint          | Method | Description                                                         |
| ----------------- | ------ | ------------------------------------------------------------------- |
| `/api/ask`        | POST   | Ask a question — JSON `{ question, sessionId? }`, returns full JSON |
| `/api/ask/stream` | POST   | Same payload, streams the answer as SSE                             |

### Sessions

| Endpoint            | Method | Description                                     |
| ------------------- | ------ | ----------------------------------------------- |
| `/api/sessions`     | GET    | List sessions with metadata (title, count, ...) |
| `/api/sessions/:id` | GET    | Load full conversation history                  |
| `/api/sessions/:id` | DELETE | Delete a session and its messages               |

## Redis Data Model

| Key Pattern      | Type  | Description                                              |
| ---------------- | ----- | -------------------------------------------------------- |
| `file:<hash>`    | Hash  | Document metadata (fileName, chunks, createdAt, content) |
| `doc:<hash>:<i>` | Hash  | Document chunk with embedding vector                     |
| `cache:<id>`     | Hash  | Cached Q&A pair with embedding vector                    |
| `session:<id>`   | List  | Conversation messages for a session (24h TTL)            |
| `meta:<id>`      | Hash  | Session metadata (`createdAt`)                           |
| `idx:docs`       | Index | Vector index for document chunk search                   |
| `idx:cache`      | Index | Vector index for semantic cache lookup                   |

## UI preview (V1)

<img width="1512" height="844" alt="image" src="https://github.com/user-attachments/assets/0888b0c1-3195-4d73-832e-16b3323b0c4f" />

## License

MIT
