import React, { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import ordersApi from '../services/ordersApi';
import type { OrderStatus } from '../types';

interface ChangeOrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: number;
  currentStatus: OrderStatus;
  orderNumber: string;
}

const ChangeOrderStatusModal: React.FC<ChangeOrderStatusModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  currentStatus,
  orderNumber
}) => {
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Определение допустимых переходов согласно новой системе
  const getAvailableStatuses = (): OrderStatus[] => {
    // Граф переходов: текущий статус -> массив допустимых следующих статусов
    const statusFlow: Record<OrderStatus, OrderStatus[]> = {
      'Создана': ['Отправлена поставщику', 'Закрыта'],
      'Отправлена поставщику': ['Подтверждена', 'Частично подтверждена', 'Создана', 'Закрыта'],
      'Частично подтверждена': ['Подтверждена', 'В сборе', 'Доставка', 'Отправлена поставщику', 'Закрыта'],
      'Подтверждена': ['В сборе', 'Доставка', 'Частично подтверждена', 'Закрыта'],
      'Доставка': ['Принята на складе', 'Подтверждена', 'Закрыта'],
      'В сборе': ['Забрана', 'Доставка', 'Подтверждена', 'Закрыта'],
      'Забрана': ['Принята на складе', 'Доставка', 'В сборе', 'Закрыта'],
      'Принята на складе': ['Закрыта', 'Забрана', 'Доставка'],
      'Закрыта': []
    };

    return statusFlow[currentStatus] || [];
  };

  const availableStatuses = getAvailableStatuses();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStatus) {
      setError('Выберите новый статус');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await ordersApi.changeOrderStatus(orderId, {
        status: newStatus as OrderStatus,
        comment: comment || undefined
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
    setNewStatus('');
    setComment('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Изменить статус заявки</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Контент */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Информация о заявке */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Заявка</p>
            <p className="font-medium text-gray-900">{orderNumber}</p>
            <p className="text-sm text-gray-600 mt-2">Текущий статус</p>
            <p className="font-medium text-blue-600">{currentStatus}</p>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Выбор нового статуса */}
          {availableStatuses.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Новый статус <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">Выберите статус</option>
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Комментарий */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий (опционально)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Добавьте комментарий к изменению статуса..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {comment.length} / 500 символов
                </p>
              </div>

              {/* Информация о правах */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Информация</p>
                    <p>
                      Изменение будет зафиксировано в истории заявки с указанием вашего имени и времени.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-1">
                Заявка в финальном статусе
              </p>
              <p className="text-sm text-gray-600">
                Статус "{currentStatus}" является финальным и не может быть изменен.
              </p>
            </div>
          )}
        </form>

        {/* Кнопки действий */}
        {availableStatuses.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !newStatus}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Изменение...
                </>
              ) : (
                'Изменить статус'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeOrderStatusModal;
