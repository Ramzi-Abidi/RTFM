import { Upload, FileText, X } from 'lucide-react';
import { Document } from '../../api/client';

interface DocumentListProps {
  documents: Document[];
  onUploadClick: () => void;
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, onUploadClick, onDelete }: DocumentListProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-700">Documents</h2>
      </div>

      <div className="p-4">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#edf3fe] text-gray-800 rounded-lg hover:bg-[#dce8fc] transition"
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
                  onClick={() => onDelete(doc.id)}
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
  );
}
