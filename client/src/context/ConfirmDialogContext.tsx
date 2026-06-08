import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { ConfirmDialogVariant } from '../components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

type Resolver = (value: boolean) => void;

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

let confirmDispatcher: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

export const confirmDialog = {
  show: (options: ConfirmOptions): Promise<boolean> =>
    confirmDispatcher?.(options) ?? Promise.resolve(false),
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, isOpen: true });
    });
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState(null);
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setState(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  useEffect(() => {
    confirmDispatcher = confirm;
    return () => {
      confirmDispatcher = null;
    };
  }, [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {state && (
        <ConfirmDialog
          isOpen={state.isOpen}
          title={state.title}
          message={state.message}
          confirmLabel={state.confirmLabel}
          cancelLabel={state.cancelLabel}
          variant={state.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirmDialog = (): ConfirmDialogContextValue => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return ctx;
};
