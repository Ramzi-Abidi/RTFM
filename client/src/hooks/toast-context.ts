import { createContext } from 'react';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
}

export type ToastInput = Omit<ToastData, 'id'>;

export interface ToastContextValue {
  toast: (options: ToastInput) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
