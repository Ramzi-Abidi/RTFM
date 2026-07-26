import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, X } from 'lucide-react';
import { Document, DocumentDetail, getDocument } from '../../api/client';
import { useToast } from '../../hooks/useToast';

interface DocumentPreviewModalProps {
  document: Document | null;
  onClose: () => void;
}

function isMarkdownFile(fileName: string) {
  return fileName.toLowerCase().endsWith('.md');
}

export function DocumentPreviewModal({ document, onClose }: DocumentPreviewModalProps) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      setLoading(true);
      setDetail(null);

      try {
        const data = await getDocument(document.id);
        if (!cancelled) {
          setDetail(data);
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            title: 'Error',
            description: e instanceof Error ? e.message : 'Failed to load document',
            variant: 'destructive',
          });
          onClose();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [document, onClose, toast]);

  if (!document) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 flex flex-col w-full h-full md:h-auto md:max-h-[85vh] md:max-w-3xl md:rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {document.fileName}
            </h3>
            {detail ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{detail.chunks} chunks</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 p-1"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 py-12">
              <Loader2 size={20} className="animate-spin" />
              Loading document...
            </div>
          ) : null}

          {detail && !loading ? (
            isMarkdownFile(detail.fileName) ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-pre:my-3 prose-pre:bg-gray-50 dark:prose-pre:bg-gray-800 prose-pre:text-gray-800 dark:prose-pre:text-gray-100 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:shadow-none prose-pre:[&_code]:bg-transparent prose-pre:[&_code]:p-0 prose-code:text-blue-600 dark:prose-code:text-blue-300 prose-code:bg-blue-50 dark:prose-code:bg-blue-950 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.content}</ReactMarkdown>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100 font-sans">
                {detail.content}
              </pre>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
