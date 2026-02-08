import React from 'react';
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { useToast, type ToastItem } from '../contexts/ToastContext';

function iconFor(t: ToastItem['type']) {
  switch (t) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
}

function borderFor(t: ToastItem['type']) {
  switch (t) {
    case 'success':
      return 'border-green-200 bg-green-50';
    case 'warning':
      return 'border-amber-200 bg-amber-50';
    case 'error':
      return 'border-red-200 bg-red-50';
    default:
      return 'border-blue-200 bg-blue-50';
  }
}

export const ToastViewport: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000] space-y-2 w-[360px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div key={t.id} className={`border rounded-lg shadow-sm p-4 ${borderFor(t.type)}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{iconFor(t.type)}</div>
            <div className="flex-1">
              {t.title && <div className="text-sm font-semibold text-gray-900">{t.title}</div>}
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{t.message}</div>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
