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

export async function ask(question: string, sessionId: string): Promise<AskResponse> {
  const res = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId }),
  });
  if (!res.ok) throw new Error('Failed to get answer');
  return res.json();
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
