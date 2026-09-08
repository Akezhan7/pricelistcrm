import React, { useRef, useState } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import type { Order } from '../types';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { FormField } from './ui/FormField';
import { IconButton } from './ui/IconButton';
import { formatPriceKZT } from '../utils/format';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, comment?: string, receipt?: File) => Promise<void>;
  order: Order;
  loading?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  loading = false,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errors, setErrors] = useState<{ amount?: string; receipt?: string }>({});
  const isBusy = loading || submitting;

  const totalAmount =
    typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : order.totalAmount;
  const paidAmount =
    typeof order.paidAmount === 'string' ? parseFloat(order.paidAmount) : order.paidAmount;
  const remainingAmount = totalAmount - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || submittingRef.current) return;

    const newErrors: { amount?: string; receipt?: string } = {};
    const paymentAmount = parseFloat(amount);

    if (errors.receipt) {
      newErrors.receipt = errors.receipt;
    }

    if (!amount || isNaN(paymentAmount) || paymentAmount <= 0) {
      newErrors.amount = 'Введите корректную сумму оплаты';
    } else if (paymentAmount > remainingAmount) {
      newErrors.amount = `Сумма превышает остаток к доплате (${formatPriceKZT(remainingAmount)})`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(paymentAmount, comment.trim() || undefined, receipt || undefined);
      setAmount('');
      setComment('');
      setReceipt(null);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Ошибка при регистрации оплаты:', error);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isBusy) return;
    setAmount('');
    setComment('');
    setReceipt(null);
    setErrors({});
    onClose();
  };

  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setReceipt(null);
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      setReceipt(null);
      setErrors((current) => ({
        ...current,
        receipt: 'Разрешены изображения JPEG, PNG, GIF, WebP и PDF',
      }));
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setReceipt(null);
      setErrors((current) => ({ ...current, receipt: 'Размер файла не должен превышать 5 МБ' }));
      event.target.value = '';
      return;
    }

    setReceipt(file);
    setErrors((current) => ({ ...current, receipt: undefined }));
  };

  const setQuickAmount = (value: number) => {
    setAmount(value.toString());
    setErrors((current) => ({ ...current, amount: undefined }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Регистрация оплаты"
      size="md"
      closeOnOverlayClick={!isBusy}
      footer={
        <FormFooter
          onCancel={handleClose}
          submitLabel="Зарегистрировать оплату"
          submitLoading={isBusy}
          submitDisabled={isBusy || !amount || parseFloat(amount) <= 0}
          onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          submitType="button"
        />
      }
    >
      <p className="text-sm text-text-muted mb-4">Заявка {order.orderNumber}</p>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4 pb-4 border-b border-border">
        <div>
          <span className="text-text-muted">Общая сумма:</span>
          <p className="font-semibold text-brand-black">{formatPriceKZT(totalAmount)}</p>
        </div>
        <div>
          <span className="text-text-muted">Уже оплачено:</span>
          <p className="font-semibold text-brand-black">{formatPriceKZT(paidAmount)}</p>
        </div>
        <div className="col-span-2">
          <span className="text-text-muted">К доплате:</span>
          <p className="text-lg font-bold text-warning">{formatPriceKZT(remainingAmount)}</p>
        </div>
        <div className="col-span-2">
          <span className="text-text-muted text-sm">Текущий статус: </span>
          <Badge
            variant={
              order.paymentStatus === 'Оплачено'
                ? 'success'
                : order.paymentStatus === 'Частично оплачено'
                  ? 'warning'
                  : 'danger'
            }
          >
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Сумма оплаты (тенге)"
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          error={errors.amount}
          placeholder="0.00"
          min={0}
          step="0.01"
          disabled={isBusy}
          required
        />

        {remainingAmount > 0 && (
          <FormField label="Быстрый выбор">
            <div className="flex flex-wrap gap-2">
              {remainingAmount >= 1000 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setQuickAmount(1000)} disabled={isBusy}>
                  1 000
                </Button>
              )}
              {remainingAmount >= 5000 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setQuickAmount(5000)} disabled={isBusy}>
                  5 000
                </Button>
              )}
              {remainingAmount >= 10000 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setQuickAmount(10000)} disabled={isBusy}>
                  10 000
                </Button>
              )}
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => setQuickAmount(remainingAmount)}
                disabled={isBusy}
              >
                Полная оплата ({formatPriceKZT(remainingAmount)})
              </Button>
            </div>
          </FormField>
        )}

        <Textarea
          label="Комментарий"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Способ оплаты, номер транзакции и т.д."
          rows={3}
          maxLength={500}
          disabled={isBusy}
          helperText={`${comment.length}/500 символов`}
          className="resize-none"
        />

        <div>
          <label
            className="mb-1.5 block text-caption font-medium text-brand-black"
            htmlFor="payment-receipt"
          >
            Чек (необязательно)
          </label>
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border-input bg-brand-white px-3 py-2">
            <Paperclip className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            <label
              htmlFor="payment-receipt"
              className="min-w-0 flex-1 cursor-pointer text-body text-brand-black"
            >
              {receipt ? (
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-brand-yellow" aria-hidden />
                  <span className="truncate">{receipt.name}</span>
                </span>
              ) : (
                'Выбрать изображение или PDF'
              )}
            </label>
            <input
              id="payment-receipt"
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"
              className="sr-only"
              onChange={handleReceiptChange}
              disabled={isBusy}
            />
            {receipt && (
              <IconButton
                icon={X}
                title="Убрать чек"
                size="sm"
                variant="ghost"
                onClick={() => setReceipt(null)}
                disabled={isBusy}
              />
            )}
          </div>
          <p className={errors.receipt ? 'mt-1.5 text-caption text-danger' : 'mt-1.5 text-caption text-text-muted'}>
            {errors.receipt || 'JPEG, PNG, GIF, WebP или PDF, до 5 МБ'}
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
