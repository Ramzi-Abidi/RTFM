import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listSessions, loadSession, deleteSession, SessionMetadata, SessionMessage } from '../api/client';
import { useToast } from './useToast';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { fileName: string; section: string; score?: number }[];
}

export function useSession(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>(urlSessionId || '');
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (urlSessionId) {
      setSessionId(urlSessionId);
      localStorage.setItem('sessionId', urlSessionId);
    }
  }, [urlSessionId]);

  useEffect(() => {
    loadSessionsData();
    const interval = setInterval(loadSessionsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSessionsData = async () => {
    try {
      const data = await listSessions();
      setSessions(data.sessions);
    } catch (e) {
      console.error('Failed to load sessions', e);
      toast({ title: 'Error', description: 'Failed to load sessions', variant: 'destructive' });
    }
  };

  const switchToSession = async (session: SessionMetadata) => {
    try {
      const data = await loadSession(session.id);
      const msgs: Message[] = data.messages.map((msg: SessionMessage) => ({
        role: msg.role,
        content: msg.content,
      }));
      setSessionId(session.id);
      setMessages(msgs);
      localStorage.setItem('sessionId', session.id);
      navigate(`/${session.id}`);
    } catch (e) {
      console.error('Failed to load session', e);
      toast({ title: 'Error', description: 'Failed to load session', variant: 'destructive' });
    }
  };

  const createNewSession = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem('sessionId', newId);
    setSessionId(newId);
    setMessages([]);
    navigate(`/${newId}`);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id);
      await loadSessionsData();
      if (sessionId === id) {
        createNewSession();
      }
      toast({ title: 'Deleted', description: 'Session removed', variant: 'success' });
    } catch (e) {
      console.error('Failed to delete session', e);
      toast({ title: 'Error', description: 'Failed to delete session', variant: 'destructive' });
    }
  };

  return {
    sessionId,
    sessions,
    switchToSession,
    handleDeleteSession,
    createNewSession,
    loadSessionsData,
  };
}
