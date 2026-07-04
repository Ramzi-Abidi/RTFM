import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
  onClose: (id: string) => void;
}

export function Toast({ id, title, description, variant = 'default', onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
        {
          'bg-white border-gray-200': variant === 'default',
          'bg-green-50 border-green-200': variant === 'success',
          'bg-red-50 border-red-200': variant === 'destructive',
        },
      )}
    >
      <div className="flex-1">
        {title && (
          <p
            className={cn('text-sm font-semibold', {
              'text-gray-900': variant === 'default',
              'text-green-800': variant === 'success',
              'text-red-800': variant === 'destructive',
            })}
          >
            {title}
          </p>
        )}
        {description && (
          <p
            className={cn('text-sm', {
              'text-gray-600': variant === 'default',
              'text-green-700': variant === 'success',
              'text-red-700': variant === 'destructive',
            })}
          >
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className={cn('rounded-md p-1 opacity-70 hover:opacity-100', {
          'text-gray-500': variant === 'default',
          'text-green-600': variant === 'success',
          'text-red-600': variant === 'destructive',
        })}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function Toaster({
  toasts,
  onClose,
}: {
  toasts: Array<Omit<ToastProps, 'onClose'>>;
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm sm:w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
