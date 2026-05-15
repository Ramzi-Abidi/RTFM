import { useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { Message } from '../../hooks/useSession';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasDocuments: boolean;
}

export function MessageList({ messages, loading, hasDocuments }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {messages.length === 0 && !hasDocuments && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <FileText size={48} className="mx-auto mb-4" />
            <p>Upload your docs to get started</p>
          </div>
        </div>
      )}

      {messages.length === 0 && hasDocuments && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p>Ask a question about your docs</p>
          </div>
        </div>
      )}

      <div className="space-y-4 max-w-3xl mx-auto">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
          />
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
  );
}
