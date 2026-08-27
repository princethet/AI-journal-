import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-600 shrink-0" />,
  };

  const borderColors = {
    success: 'border-emerald-200 bg-emerald-50/95 text-emerald-950',
    error: 'border-rose-200 bg-rose-50/95 text-rose-950',
    info: 'border-indigo-200 bg-indigo-50/95 text-indigo-950',
  };

  return (
    <div
      id={`toast-item-${toast.id}`}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${borderColors[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
        {toast.message && <p className="text-xs mt-1 leading-relaxed opacity-90">{toast.message}</p>}
      </div>
      <button
        id={`toast-dismiss-${toast.id}`}
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
