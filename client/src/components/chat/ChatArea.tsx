import { FileText, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Message } from '../../hooks/useSession';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  loading: boolean;
  hasDocuments: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  onOpenDocs?: () => void;
  onOpenChats?: () => void;
}

export function ChatArea({
  messages,
  input,
  loading,
  hasDocuments,
  onInputChange,
  onSend,
  onNewChat,
  onOpenDocs,
  onOpenChats,
}: ChatAreaProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col min-w-0 w-full">
      <div className="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center gap-2 px-3 sm:px-6">
        {onOpenDocs ? (
          <button
            type="button"
            onClick={onOpenDocs}
            className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
            aria-label="Open documents"
          >
            <FileText size={20} />
          </button>
        ) : null}

        <h1 className="flex-1 truncate text-lg sm:text-xl font-bold text-gray-800">
          RTFM For Me
        </h1>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onOpenChats ? (
            <button
              type="button"
              onClick={onOpenChats}
              className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
              aria-label="Open chats"
            >
              <MessageSquare size={20} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-2 rounded-lg px-2 sm:px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
            title="Start new conversation"
          >
            <MessageSquarePlus size={18} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      <MessageList messages={messages} loading={loading} hasDocuments={hasDocuments} />

      <ChatInput input={input} loading={loading} onInputChange={onInputChange} onSend={onSend} />
    </div>
  );
}
