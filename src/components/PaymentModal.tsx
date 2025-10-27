import React, { useState } from 'react';
import { X, CreditCard, DollarSign } from 'lucide-react';
import type { Order } from '../types';

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
  loading = false
}) => {
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [errors, setErrors] = useState<{amount?: string}>({});

  // Расчет оставшейся суммы к доплате
  const totalAmount = typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : order.totalAmount;
  const paidAmount = typeof order.paidAmount === 'string' ? parseFloat(order.paidAmount) : order.paidAmount;
  const remainingAmount = totalAmount - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    const newErrors: {amount?: string} = {};
    const paymentAmount = parseFloat(amount);

    if (!amount || isNaN(paymentAmount) || paymentAmount <= 0) {
      newErrors.amount = 'Введите корректную сумму оплаты';
    } else if (paymentAmount > remainingAmount) {
      newErrors.amount = `Сумма превышает остаток к доплате (${remainingAmount.toFixed(2)} тенге)`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(paymentAmount, comment.trim() || undefined);
      // Очистка формы после успешной отправки
      setAmount('');
      setComment('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Ошибка при регистрации оплаты:', error);
    }
  };

  const handleClose = () => {
    setAmount('');
    setComment('');
    setErrors({});
    onClose();
  };

  // Быстрый выбор суммы
  const setQuickAmount = (value: number) => {
    setAmount(value.toString());
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Регистрация оплаты
              </h2>
              <p className="text-sm text-gray-500">
                Заявка {order.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Информация о заявке */}
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Общая сумма:</span>
              <p className="font-semibold text-gray-900">
                {totalAmount.toFixed(2)} тенге
              </p>
            </div>
            <div>
              <span className="text-gray-500">Уже оплачено:</span>
              <p className="font-semibold text-gray-900">
                {paidAmount.toFixed(2)} тенге
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">К доплате:</span>
              <p className="text-lg font-bold text-orange-600">
                {remainingAmount.toFixed(2)} тенге
              </p>
            </div>
          </div>

          {/* Статус оплаты */}
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Текущий статус: </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              order.paymentStatus === 'Оплачено' 
                ? 'bg-green-100 text-green-800'
                : order.paymentStatus === 'Частично оплачено'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Сумма оплаты */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Сумма оплаты (тенге) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors(prev => ({ ...prev, amount: undefined }));
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.amount
                  ? 'border-red-300 focus:border-red-300 focus:ring-red-200'
                  : 'border-gray-300 focus:border-blue-300 focus:ring-blue-200'
              }`}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={loading}
              required
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Быстрый выбор */}
          {remainingAmount > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Быстрый выбор:</p>
              <div className="flex flex-wrap gap-2">
                {remainingAmount >= 1000 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(1000)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={loading}
                  >
                    1,000
                  </button>
                )}
                {remainingAmount >= 5000 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(5000)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={loading}
                  >
                    5,000
                  </button>
                )}
                {remainingAmount >= 10000 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(10000)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={loading}
                  >
                    10,000
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setQuickAmount(remainingAmount)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium"
                  disabled={loading}
                >
                  Полная оплата ({remainingAmount.toFixed(2)})
                </button>
              </div>
            </div>
          )}

          {/* Комментарий */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:border-blue-300 focus:ring-blue-200"
              placeholder="Способ оплаты, номер транзакции и т.д."
              rows={3}
              maxLength={500}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {comment.length}/500 символов
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? 'Обработка...' : 'Зарегистрировать оплату'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;