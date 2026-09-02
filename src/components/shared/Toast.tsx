import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-md left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-sm pointer-events-none items-center max-w-[90vw] md:max-w-md">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[rgba(122,139,115,0.1)] text-moss border-moss/20';
      case 'error':
        return 'bg-[rgba(184,92,56,0.1)] text-rust border-rust/20';
      case 'warning':
        return 'bg-[rgba(232,197,192,0.2)] text-rust border-sakura/40';
      case 'info':
      default:
        return 'bg-surface-hover text-ink-700 border-border-base';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        // If message already has a checkmark, we can omit the icon or use a simpler one
        return toast.message.startsWith('✓') ? null : <CheckCircle2 className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto
        flex items-center gap-sm px-md py-sm rounded-none border shadow-level-3 bg-bg-elevated
        animate-in fade-in slide-in-from-top-4 duration-300
        ${getStyles()}
      `}
    >
      {getIcon() && <span className="shrink-0">{getIcon()}</span>}
      <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-xs hover:opacity-70 transition-opacity p-xs"
        aria-label="Close notification"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
