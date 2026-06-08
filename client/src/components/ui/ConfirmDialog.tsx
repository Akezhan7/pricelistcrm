import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmDialogVariant = 'danger' | 'default';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Подтвердите действие',
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
  children,
}) => {
  const handleClose = () => {
    if (!loading) onCancel();
  };

  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex items-center justify-end gap-2.5 px-4 py-3.5 sm:px-5">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'rounded-lg p-2.5 flex-shrink-0',
              isDanger ? 'bg-danger-light text-danger' : 'bg-surface-accent text-brand-yellow-dark'
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-body text-text-muted leading-relaxed pt-0.5">{message}</p>
        </div>
        {children}
      </div>
    </Modal>
  );
};
