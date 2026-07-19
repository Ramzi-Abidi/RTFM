export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  fileName: string;
  section: string;
  chunkIndex: number;
}

export interface Document {
  id: string;
  fileName: string;
  chunks: number;
  createdAt: string;
}

export interface AskRequest {
  question: string;
  sessionId?: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
}

export interface Source {
  fileName: string;
  section: string;
  score?: number;
}

export type AskStreamEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'token'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface IngestResponse {
  success: boolean;
  files: { fileName: string; chunks: number }[];
  totalChunks: number;
}
