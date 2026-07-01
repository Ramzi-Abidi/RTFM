import { useState, useEffect, useCallback } from 'react';
import { ask, uploadDocs, listDocs, deleteDoc, Document, SessionMetadata } from './api/client';
import { Toaster } from '@/components/ui/toast';
import { useToast } from '@/hooks/useToast';
import { useSession, Message } from './hooks/useSession';
import { DocumentList } from './components/documents/DocumentList';
import { ChatArea } from './components/chat/ChatArea';
import { ChatList } from './components/chat/ChatList';
import { UploadModal } from './components/modals/UploadModal';
import { DocumentPreviewModal } from './components/modals/DocumentPreviewModal';
import { MobileDrawer } from './components/layout/MobileDrawer';

type MobilePanel = 'docs' | 'chats' | null;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const { toasts, toast, dismiss } = useToast();
  const closePreview = useCallback(() => setPreviewDocument(null), []);
  const closeMobilePanel = useCallback(() => setMobilePanel(null), []);

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
      if (previewDocument?.id === id) {
        closePreview();
      }
      toast({ title: 'Deleted', description: 'Document removed', variant: 'success' });
    } catch (e) {
      console.error('Failed to delete', e);
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const handlePreview = (doc: Document) => {
    setPreviewDocument(doc);
    closeMobilePanel();
  };

  const handleSwitchSession = (session: SessionMetadata) => {
    switchToSession(session);
    closeMobilePanel();
  };

  const documentListProps = {
    documents,
    onUploadClick: () => setShowUpload(true),
    onPreview: handlePreview,
    onDelete: handleDeleteDoc,
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <DocumentList
        {...documentListProps}
        className="hidden lg:flex"
      />

      <ChatArea
        messages={messages}
        input={input}
        loading={loading}
        hasDocuments={documents.length > 0}
        onInputChange={setInput}
        onSend={handleSend}
        onNewChat={createNewSession}
        onOpenDocs={() => setMobilePanel('docs')}
        onOpenChats={() => setMobilePanel('chats')}
      />

      <ChatList
        sessions={sessions}
        activeSessionId={sessionId}
        onSwitch={handleSwitchSession}
        onDelete={handleDeleteSession}
        className="hidden lg:flex"
      />

      <MobileDrawer
        open={mobilePanel === 'docs'}
        onClose={closeMobilePanel}
        side="left"
        title="Documents"
      >
        <DocumentList {...documentListProps} className="w-full border-r-0" showHeader={false} />
      </MobileDrawer>

      <MobileDrawer
        open={mobilePanel === 'chats'}
        onClose={closeMobilePanel}
        side="right"
        title="Chats"
      >
        <ChatList
          sessions={sessions}
          activeSessionId={sessionId}
          onSwitch={handleSwitchSession}
          onDelete={handleDeleteSession}
          className="w-full border-l-0"
          showHeader={false}
        />
      </MobileDrawer>

      <UploadModal
        show={showUpload}
        uploading={uploading}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
      />

      <DocumentPreviewModal
        document={previewDocument}
        onClose={closePreview}
        toast={toast}
      />

      <Toaster toasts={toasts} onClose={dismiss} />
    </div>
  );
}
