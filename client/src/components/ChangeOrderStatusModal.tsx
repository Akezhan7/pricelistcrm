import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import ordersApi from '../services/ordersApi';
import type { OrderStatus } from '../types';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Alert } from './ui/Alert';
import { Spinner } from './ui/Spinner';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { formatPriceKZT } from '../utils/format';

interface ChangeOrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: number;
  currentStatus: OrderStatus;
  orderNumber: string;
  remainingAmount: number;
}

const ChangeOrderStatusModal: React.FC<ChangeOrderStatusModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  currentStatus,
  orderNumber,
  remainingAmount,
}) => {
  const { confirm } = useConfirmDialog();
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<OrderStatus[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingOptions(true);
    setError(null);
    ordersApi.getOrderStatusOptions(orderId)
      .then((options) => {
        if (active) setAvailableStatuses(options.availableStatuses);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Не удалось получить доступные статусы');
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, orderId, currentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStatus) {
      setError('Выберите новый статус');
      return;
    }

    if (newStatus === 'Закрыта' && remainingAmount > 0) {
      const approved = await confirm({
        title: 'Закрыть заявку?',
        message: `Неоплаченный остаток ${formatPriceKZT(remainingAmount)} сохранится в задолженности поставщика.`,
        confirmLabel: 'Закрыть',
        variant: 'default',
      });
      if (!approved) return;
    }

    if (newStatus === 'Отменена') {
      const approved = await confirm({
        title: 'Отменить заявку?',
        message: 'Заявка останется в истории, но перестанет участвовать в рабочем процессе и задолженности.',
        confirmLabel: 'Отменить заявку',
        variant: 'danger',
      });
      if (!approved) return;
    }

    try {
      setLoading(true);
      setError(null);

      await ordersApi.changeOrderStatus(orderId, {
        status: newStatus as OrderStatus,
        comment: comment || undefined,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка изменения статуса');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setNewStatus('');
    setComment('');
    setError(null);
    setAvailableStatuses([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Изменить статус заявки"
      size="md"
      closeOnOverlayClick={!loading}
      footer={
        availableStatuses.length > 0 ? (
          <FormFooter
            onCancel={handleClose}
            submitLabel="Изменить статус"
            submitLoading={loading}
            submitDisabled={loading || !newStatus}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
          />
        ) : undefined
      }
    >
      <div className="bg-surface-muted p-4 rounded-card mb-4">
        <p className="text-sm text-text-muted">Заявка</p>
        <p className="font-medium text-brand-black">{orderNumber}</p>
        <p className="text-sm text-text-muted mt-2">Текущий статус</p>
        <p className="font-medium text-accent">{currentStatus}</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {loadingOptions ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : availableStatuses.length > 0 ? (
        <form id="change-status-form" onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Новый статус"
            required
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
            disabled={loading}
          >
            <option value="">Выберите статус</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>

          <Textarea
            label="Комментарий (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Добавьте комментарий к изменению статуса..."
            disabled={loading}
            maxLength={500}
            helperText={`${comment.length} / 500 символов`}
            className="resize-none"
          />

          <Alert variant="info" title="Информация" icon={CheckCircle}>
            Изменение будет зафиксировано в истории заявки с указанием вашего имени и времени.
          </Alert>

          {newStatus === 'Закрыта' && remainingAmount > 0 && (
            <Alert variant="warning">
              Остаток {formatPriceKZT(remainingAmount)} будет учтён как долг поставщику.
            </Alert>
          )}

          {newStatus === 'Отменена' && (
            <Alert variant="warning">
              Отмена не удаляет заявку и не создаёт задолженность.
            </Alert>
          )}
        </form>
      ) : (
        <div className="bg-surface-muted border border-border rounded-card p-6 text-center">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-brand-black font-medium mb-1">Заявка в финальном статусе</p>
          <p className="text-sm text-text-muted">
            Статус «{currentStatus}» является финальным и не может быть изменен.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ChangeOrderStatusModal;
