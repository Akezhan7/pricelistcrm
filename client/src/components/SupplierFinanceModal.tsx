import React, { useState, useEffect } from 'react';
import { X, Plus, CreditCard, MessageSquare } from 'lucide-react';
import { createPayment, getPaymentsBySupplier, formatPaymentAmount, formatPaymentDate, getPaymentMethodIcon, getPaymentMethodColor, type CreatePaymentData, type SupplierPaymentData } from '../services/paymentsApi';

interface SupplierFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  supplierName: string;
  onSuccess?: () => void;
}

export const SupplierFinanceModal: React.FC<SupplierFinanceModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [supplierData, setSupplierData] = useState<SupplierPaymentData | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Форма добавления платежа
  const [paymentForm, setPaymentForm] = useState<CreatePaymentData>({
    supplierId,
    amount: 0,
    paymentMethod: 'Наличные',
    comment: '',
  });
  
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && supplierId) {
      loadSupplierData();
    }
  }, [isOpen, supplierId]);

  const loadSupplierData = async () => {
    setLoading(true);
    try {
      const data = await getPaymentsBySupplier(supplierId);
      setSupplierData(data);
    } catch (error) {
      console.error('Ошибка загрузки данных поставщика:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowAddPayment(false);
    setPaymentForm({
      supplierId,
      amount: 0,
      paymentMethod: 'Наличные',
      comment: '',
    });
    setSelectedOrders([]);
    onClose();
  };

  const handleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const calculateTotalDebt = () => {
    if (!supplierData) return 0;
    
    if (selectedOrders.length === 0) {
      return parseFloat(supplierData.stats.totalDebt);
    }
    
    return supplierData.unpaidOrders
      .filter(order => selectedOrders.includes(order.id))
      .reduce((sum, order) => {
        return sum + (parseFloat(order.totalAmount) - parseFloat(order.paidAmount));
      }, 0);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentForm.amount <= 0) {
      alert('Введите сумму платежа');
      return;
    }

    setSubmitting(true);
    try {
      await createPayment({
        ...paymentForm,
        orderIds: selectedOrders.length > 0 ? selectedOrders : undefined,
      });
      
      // Перезагрузить данные
      await loadSupplierData();
      
      // Сбросить форму
      setShowAddPayment(false);
      setPaymentForm({
        supplierId,
        amount: 0,
        paymentMethod: 'Наличные',
        comment: '',
      });
      setSelectedOrders([]);
      
      onSuccess?.();
    } catch (error) {
      console.error('Ошибка создания платежа:', error);
      alert('Ошибка при регистрации платежа');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Финансы - {supplierName}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : supplierData ? (
            <div className="space-y-6">
              {/* Статистика */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-800">
                    {formatPaymentAmount(supplierData.stats.totalDebt)}
                  </div>
                  <div className="text-sm text-red-600">Общая задолженность</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-800">
                    {formatPaymentAmount(supplierData.stats.totalPaid)}
                  </div>
                  <div className="text-sm text-green-600">Всего оплачено</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-800">
                    {supplierData.stats.unpaidOrdersCount}
                  </div>
                  <div className="text-sm text-blue-600">Неоплаченных заявок</div>
                </div>
              </div>

              {/* Кнопка добавления платежа */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Неоплаченные заявки</h3>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Зарегистрировать платеж
                </button>
              </div>

              {/* Форма добавления платежа */}
              {showAddPayment && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-4">Новый платеж</h4>
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Сумма платежа *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentForm.amount || ''}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                          className="input-field"
                          placeholder="Введите сумму"
                          required
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Доступно к оплате: {formatPaymentAmount(calculateTotalDebt())}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Способ оплаты
                        </label>
                        <select
                          value={paymentForm.paymentMethod}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                          className="input-field"
                        >
                          <option value="Наличные">💵 Наличные</option>
                          <option value="Перевод">🏦 Перевод</option>
                          <option value="Карта">💳 Карта</option>
                          <option value="Другое">💼 Другое</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Комментарий
                      </label>
                      <textarea
                        value={paymentForm.comment}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="input-field"
                        rows={3}
                        placeholder="Дополнительная информация о платеже"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAddPayment(false)}
                        className="btn-secondary"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2"
                      >
                        {submitting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {submitting ? 'Обработка...' : 'Зарегистрировать'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Список неоплаченных заявок */}
              {supplierData.unpaidOrders.length > 0 ? (
                <div className="space-y-3">
                  {supplierData.unpaidOrders.map((order) => {
                    const remaining = parseFloat(order.totalAmount) - parseFloat(order.paidAmount);
                    const isSelected = selectedOrders.includes(order.id);
                    
                    return (
                      <div
                        key={order.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => showAddPayment && handleOrderSelection(order.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {showAddPayment && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleOrderSelection(order.id)}
                                className="rounded border-gray-300"
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{order.orderNumber}</div>
                              <div className="text-sm text-gray-500">
                                {formatPaymentDate(order.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {formatPaymentAmount(remaining)}
                            </div>
                            <div className="text-sm text-gray-500">
                              из {formatPaymentAmount(order.totalAmount)}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                              order.paymentStatus === 'Не оплачено' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.paymentStatus}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Все заявки оплачены</p>
                </div>
              )}

              {/* История платежей */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">История платежей</h3>
                {supplierData.payments.length > 0 ? (
                  <div className="space-y-3">
                    {supplierData.payments.slice(0, 10).map((payment) => (
                      <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {getPaymentMethodIcon(payment.paymentMethod)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {formatPaymentAmount(payment.amount)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatPaymentDate(payment.paymentDate)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded-full inline-block ${getPaymentMethodColor(payment.paymentMethod)}`}>
                              {payment.paymentMethod}
                            </div>
                            {payment.creator && (
                              <div className="text-xs text-gray-500 mt-1">
                                {payment.creator.name}
                              </div>
                            )}
                          </div>
                        </div>
                        {payment.comment && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {payment.comment}
                          </div>
                        )}
                      </div>
                    ))}
                    {supplierData.payments.length > 10 && (
                      <div className="text-center">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Показать еще ({supplierData.payments.length - 10})
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Платежи пока не регистрировались</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SupplierFinanceModal;