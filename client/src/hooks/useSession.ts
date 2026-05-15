import { useState, useEffect } from 'react';
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
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const { toast } = useToast();

  const updateUrl = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', id);
    window.history.pushState({ sessionId: id }, '', url.toString());
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');

    if (urlSessionId) {
      setSessionId(urlSessionId);
      localStorage.setItem('sessionId', urlSessionId);
    } else {
      const stored = localStorage.getItem('sessionId');
      if (stored) {
        setSessionId(stored);
        updateUrl(stored);
      } else {
        const newId = crypto.randomUUID();
        localStorage.setItem('sessionId', newId);
        setSessionId(newId);
        updateUrl(newId);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.sessionId) {
        const session = sessions.find(s => s.id === event.state.sessionId);
        if (session) switchToSession(session);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sessions]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
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
      updateUrl(session.id);
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
    updateUrl(newId);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id);
      await loadSessions();
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
    loadSessions,
  };
}
