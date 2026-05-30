import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Source } from '../../api/client';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export function MessageBubble({ role, content, sources }: MessageBubbleProps) {
  return (
    <div>
      <div
        className={`p-4 rounded-lg ${
          role === 'user'
            ? 'bg-blue-500 text-white ml-auto max-w-md'
            : 'bg-white border border-gray-200 max-w-2xl'
        }`}
      >
        <p className="text-sm font-medium mb-1">
          {role === 'user' ? 'You' : 'Bot'}
        </p>
        {role === 'user' ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:my-2 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {sources.map((src, j) => (
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
  );
}
