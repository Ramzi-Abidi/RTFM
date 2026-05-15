import { MessageSquarePlus } from 'lucide-react';
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
}

export function ChatArea({
  messages,
  input,
  loading,
  hasDocuments,
  onInputChange,
  onSend,
  onNewChat,
}: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-gray-800">RTFM For Me</h1>
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          title="Start new conversation"
        >
          <MessageSquarePlus size={18} />
          New Chat
        </button>
      </div>

      <MessageList
        messages={messages}
        loading={loading}
        hasDocuments={hasDocuments}
      />

      <ChatInput
        input={input}
        loading={loading}
        onInputChange={onInputChange}
        onSend={onSend}
      />
    </div>
  );
}
