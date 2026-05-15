import { useState, useEffect } from 'react';
import { ask, uploadDocs, listDocs, deleteDoc, Document } from './api/client';
import { Toaster } from '@/components/ui/toast';
import { useToast } from '@/hooks/useToast';
import { useSession, Message } from './hooks/useSession';
import { DocumentList } from './components/documents/DocumentList';
import { ChatArea } from './components/chat/ChatArea';
import { ChatList } from './components/chat/ChatList';
import { UploadModal } from './components/modals/UploadModal';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const { sessionId, sessions, switchToSession, handleDeleteSession, createNewSession } =
    useSession(setMessages);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await listDocs();
      setDocuments(data.documents);
    } catch (e) {
      console.error('Failed to load documents', e);
      toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const response = await ask(question, sessionId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer, sources: response.sources },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
      toast({ title: 'Error', description: 'Failed to get answer', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const result = await uploadDocs(files);
      await loadDocuments();
      setShowUpload(false);
      toast({
        title: 'Success',
        description: `Uploaded ${result.files.length} file(s) with ${result.totalChunks} chunks`,
        variant: 'success',
      });
    } catch (e) {
      console.error('Failed to upload', e);
      toast({ title: 'Error', description: 'Failed to upload documents', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteDoc(id);
      await loadDocuments();
      toast({ title: 'Deleted', description: 'Document removed', variant: 'success' });
    } catch (e) {
      console.error('Failed to delete', e);
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <DocumentList
        documents={documents}
        onUploadClick={() => setShowUpload(true)}
        onDelete={handleDeleteDoc}
      />

      <ChatArea
        messages={messages}
        input={input}
        loading={loading}
        hasDocuments={documents.length > 0}
        onInputChange={setInput}
        onSend={handleSend}
        onNewChat={createNewSession}
      />

      <UploadModal
        show={showUpload}
        uploading={uploading}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
      />

      <ChatList
        sessions={sessions}
        activeSessionId={sessionId}
        onSwitch={switchToSession}
        onDelete={handleDeleteSession}
      />

      <Toaster toasts={toasts} onClose={dismiss} />
    </div>
  );
}
