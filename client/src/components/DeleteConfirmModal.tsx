import React from 'react';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Alert } from './ui/Alert';

type DeleteConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  message: string;
  itemName?: string;
};

/** Специализированный confirm для удаления сущностей (товар, категория, поставщик). */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title,
  message,
  itemName,
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    title={title}
    message={message}
    variant="danger"
    confirmLabel={loading ? 'Удаление...' : 'Удалить'}
    onConfirm={onConfirm}
    onCancel={onClose}
    loading={loading}
  >
    {itemName && (
      <p className="text-sm text-text-muted bg-surface-inset rounded-xl p-3 border border-border-subtle">
        <strong className="text-brand-black">Элемент:</strong> {itemName}
      </p>
    )}
    <Alert variant="error">Это действие нельзя отменить!</Alert>
  </ConfirmDialog>
);
