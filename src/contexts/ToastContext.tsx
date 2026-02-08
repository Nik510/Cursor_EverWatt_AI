import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timeoutMs?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = uid();
      const item: ToastItem = { id, timeoutMs: 4500, ...t };
      setToasts((prev) => [item, ...prev].slice(0, 5));
      const timeout = item.timeoutMs ?? 0;
      if (timeout > 0) {
        window.setTimeout(() => dismiss(id), timeout);
      }
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toasts, toast, dismiss, clear }), [toasts, toast, dismiss, clear]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
