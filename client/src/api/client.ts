const API_URL = '/api';

export interface Source {
  fileName: string;
  section: string;
  score?: number;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
}

export interface Document {
  id: string;
  fileName: string;
  chunks: number;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  content: string;
  chunks: number;
}

export interface SessionMetadata {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IngestResponse {
  success: boolean;
  files: { fileName: string; chunks: number }[];
  totalChunks: number;
}

export type AskStreamEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'token'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface AskStreamHandlers {
  onSources?: (sources: Source[]) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

export async function ask(question: string, sessionId: string): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId }),
  });
  if (!res.ok) throw new Error('Failed to get answer');
  return res.json();
}

export async function askStream(
  question: string,
  sessionId: string,
  handlers: AskStreamHandlers = {},
) {
  const res = await fetch(`${API_URL}/ask/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId }),
    signal: handlers.signal,
  });

  if (!res.ok) {
    throw new Error('Failed to get answer');
  }

  if (!res.body) {
    throw new Error('Streaming is not supported in this browser');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload) continue;

      let event: AskStreamEvent;
      try {
        event = JSON.parse(payload) as AskStreamEvent;
      } catch {
        continue;
      }

      if (event.type === 'sources') {
        handlers.onSources?.(event.sources);
      } else if (event.type === 'token') {
        handlers.onToken?.(event.value);
      } else if (event.type === 'done') {
        handlers.onDone?.();
        return;
      } else if (event.type === 'error') {
        throw new Error(event.message);
      }
    }
  }

  handlers.onDone?.();
}

export async function uploadDocs(files: FileList): Promise<IngestResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const res = await fetch(`${API_URL}/ingest`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload documents');
  return res.json();
}

export async function listDocs(): Promise<{ documents: Document[] }> {
  const res = await fetch(`${API_URL}/documents`);
  if (!res.ok) throw new Error('Failed to list documents');
  return res.json();
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const res = await fetch(`${API_URL}/documents/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || 'Failed to load document');
  }
  return res.json();
}

export async function deleteDoc(id: string) {
  const res = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function listSessions(): Promise<{ sessions: SessionMetadata[] }> {
  const res = await fetch(`${API_URL}/sessions`);
  if (!res.ok) throw new Error('Failed to list sessions');
  return res.json();
}

export async function loadSession(id: string): Promise<{ messages: SessionMessage[] }> {
  const res = await fetch(`${API_URL}/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to load session');
  return res.json();
}

export async function deleteSession(id: string) {
  const res = await fetch(`${API_URL}/sessions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
}
