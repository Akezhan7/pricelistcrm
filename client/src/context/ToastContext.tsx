import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ToastContainer } from '../components/ui/Toast';
import type { ToastItem, ToastVariant } from '../components/ui/Toast';

interface ToastInput {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (input: ToastInput) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastDispatcher: ToastContextValue | null = null;

const createId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const toast = {
  success: (message: string, duration?: number) =>
    toastDispatcher?.success(message, duration) ?? '',
  error: (message: string, duration?: number) =>
    toastDispatcher?.error(message, duration) ?? '',
  info: (message: string, duration?: number) =>
    toastDispatcher?.info(message, duration) ?? '',
  warning: (message: string, duration?: number) =>
    toastDispatcher?.warning(message, duration) ?? '',
  dismiss: (id: string) => toastDispatcher?.dismiss(id),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ message, variant = 'info', duration }: ToastInput) => {
      const id = createId();
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, duration?: number) => show({ message, variant: 'success', duration }),
    [show]
  );

  const error = useCallback(
    (message: string, duration?: number) => show({ message, variant: 'error', duration }),
    [show]
  );

  const info = useCallback(
    (message: string, duration?: number) => show({ message, variant: 'info', duration }),
    [show]
  );

  const warning = useCallback(
    (message: string, duration?: number) => show({ message, variant: 'warning', duration }),
    [show]
  );

  const value = useMemo(
    () => ({ show, success, error, info, warning, dismiss }),
    [show, success, error, info, warning, dismiss]
  );

  useEffect(() => {
    toastDispatcher = value;
    return () => {
      toastDispatcher = null;
    };
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        position={isMobile ? 'bottom-center' : 'top-right'}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
