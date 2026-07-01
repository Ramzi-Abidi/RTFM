import { Upload, FileText, X } from 'lucide-react';
import { Document } from '../../api/client';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  documents: Document[];
  onUploadClick: () => void;
  onPreview: (doc: Document) => void;
  onDelete: (id: string) => void;
  className?: string;
  showHeader?: boolean;
}

export function DocumentList({
  documents,
  onUploadClick,
  onPreview,
  onDelete,
  className,
  showHeader = true,
}: DocumentListProps) {
  return (
    <div
      className={cn(
        'w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full',
        className,
      )}
    >
      {showHeader ? (
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">Documents</h2>
        </div>
      ) : null}

      <div className="p-4">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#edf3fe] text-gray-800 rounded-lg hover:bg-[#dce8fc] transition"
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
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{doc.fileName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0 p-2 -m-1"
                  aria-label={`Delete ${doc.fileName}`}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
