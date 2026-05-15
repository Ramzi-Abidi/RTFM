import { useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';

interface UploadModalProps {
  show: boolean;
  uploading: boolean;
  onClose: () => void;
  onUpload: (files: FileList | null) => void;
}

export function UploadModal({ show, uploading, onClose, onUpload }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upload Documents</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
          onChange={(e) => onUpload(e.target.files)}
        />

        {uploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-blue-500">
            <Loader2 size={16} className="animate-spin" />
            Uploading...
          </div>
        )}
      </div>
    </div>
  );
}
