import { useState, useEffect, useRef } from 'react';
import { Send, Upload, FileText, X, Loader2 } from 'lucide-react';
import { ask, uploadDocs, listDocs, deleteDoc, Document, Source } from './api/client';
import { Toaster } from '@/components/ui/toast';
import { useToast } from '@/hooks/useToast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDocuments = async () => {
    try {
      const data = await listDocs();
      console.log("docs returned from redis", data.documents);
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
      const response = await ask(question);
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

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(id);
      await loadDocuments();
      toast({ title: 'Deleted', description: 'Document removed', variant: 'success' });
    } catch (e) {
      console.error('Failed to delete', e);
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">Documents</h2>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowUpload(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            <Upload size={18} />
            Upload
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {documents.length === 0 ? (
            <p className="text-gray-400 text-sm">No files yet</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{doc.fileName}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-6">
          <h1 className="text-xl font-bold text-gray-800">RTFM For Me</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && documents.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <FileText size={48} className="mx-auto mb-4" />
                <p>Upload your docs to get started</p>
              </div>
            </div>
          ): null}

          {messages.length === 0 && documents.length > 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p>Ask a question about your docs</p>
              </div>
            </div>
          )}

          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white ml-auto max-w-md'
                      : 'bg-white border border-gray-200 max-w-2xl'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {msg.role === 'user' ? 'You' : 'Bot'}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.sources.map((src, j) => (
                      <span
                        key={j}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >
                        {src.fileName}
                        {src.section && `#${src.section}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg max-w-2xl">
                <p className="text-sm font-medium mb-1">Bot</p>
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Documents</h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Drop files here or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">.md, .txt files</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.txt"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />

            {uploading ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-blue-500">
                <Loader2 size={16} className="animate-spin" />
                Uploading...
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <Toaster toasts={toasts} onClose={dismiss} />
    </div>
  );
}
