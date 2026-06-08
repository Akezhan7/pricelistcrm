import React, { useState } from 'react';
import type { Order } from '../types';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { FormField } from './ui/FormField';
import { formatPriceKZT } from '../utils/format';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, comment?: string) => Promise<void>;
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
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const totalAmount =
    typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : order.totalAmount;
  const paidAmount =
    typeof order.paidAmount === 'string' ? parseFloat(order.paidAmount) : order.paidAmount;
  const remainingAmount = totalAmount - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { amount?: string } = {};
    const paymentAmount = parseFloat(amount);

    if (!amount || isNaN(paymentAmount) || paymentAmount <= 0) {
      newErrors.amount = 'Введите корректную сумму оплаты';
    } else if (paymentAmount > remainingAmount) {
      newErrors.amount = `Сумма превышает остаток к доплате (${formatPriceKZT(remainingAmount)})`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(paymentAmount, comment.trim() || undefined);
      setAmount('');
      setComment('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Ошибка при регистрации оплаты:', error);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setAmount('');
    setComment('');
    setErrors({});
    onClose();
  };

  const setQuickAmount = (value: number) => {
    setAmount(value.toString());
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Регистрация оплаты"
      size="md"
      closeOnOverlayClick={!loading}
      footer={
        <FormFooter
          onCancel={handleClose}
          submitLabel="Зарегистрировать оплату"
          submitLoading={loading}
          submitDisabled={loading || !amount || parseFloat(amount) <= 0}
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
          disabled={loading}
          required
        />

        {remainingAmount > 0 && (
          <FormField label="Быстрый выбор">
            <div className="flex flex-wrap gap-2">
              {remainingAmount >= 1000 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setQuickAmount(1000)} disabled={loading}>
                  1 000
                </Button>
              )}
              {remainingAmount >= 5000 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setQuickAmount(5000)} disabled={loading}>
                  5 000
                </Button>
              )}
              {remainingAmount >= 10000 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setQuickAmount(10000)} disabled={loading}>
                  10 000
                </Button>
              )}
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => setQuickAmount(remainingAmount)}
                disabled={loading}
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
          disabled={loading}
          helperText={`${comment.length}/500 символов`}
          className="resize-none"
        />
      </form>
    </Modal>
  );
};

export default PaymentModal;
