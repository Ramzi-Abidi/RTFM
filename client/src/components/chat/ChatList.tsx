import { MessageSquare, Trash2 } from 'lucide-react';
import { SessionMetadata } from '../../api/client';

interface ChatListProps {
  sessions: SessionMetadata[];
  activeSessionId: string;
  onSwitch: (session: SessionMetadata) => void;
  onDelete: (id: string) => void;
}

export function ChatList({ sessions, activeSessionId, onSwitch, onDelete }: ChatListProps) {
  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-700">Chats</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center p-4">No chats yet</p>
        ) : (
          <ul className="p-2 space-y-1">
            {sessions.map((session) => (
              <li
                key={session.id}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSwitch(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {session.lastMessage}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {session.messageCount} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0 ml-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
