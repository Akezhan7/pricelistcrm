import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  MapPin,
  Package,
  Truck,
  Warehouse,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  User,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Layout } from '../components/Layout';
import ordersApi from '../services/ordersApi';
import ChangeOrderStatusModal from '../components/ChangeOrderStatusModal';
import PaymentModal from '../components/PaymentModal';
import { UpdatePricesFromOrderModal } from '../components/UpdatePricesFromOrderModal';
import type { Order, OrderStatus } from '../types';

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdatePricesModal, setShowUpdatePricesModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.getOrderById(Number(id));
      setOrder(data);
      
      // Загружаем историю платежей
      try {
        const paymentsData = await ordersApi.getOrderPayments(Number(id));
        setPayments(paymentsData.payments || []);
      } catch (err) {
        console.error('Ошибка загрузки платежей:', err);
        setPayments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки заявки');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id, loadOrder]);

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      'В работе': 'bg-blue-100 text-blue-800 border-blue-200',
      'На точке': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'В пути': 'bg-purple-100 text-purple-800 border-purple-200',
      'На складе': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      'В работе': <Package className="w-5 h-5" />,
      'На точке': <MapPin className="w-5 h-5" />,
      'В пути': <Truck className="w-5 h-5" />,
      'На складе': <Warehouse className="w-5 h-5" />
    };
    return icons[status];
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Не оплачено': 'text-red-600',
      'Частично оплачено': 'text-orange-600',
      'Оплачено': 'text-green-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const calculatePaymentProgress = () => {
    if (!order) return 0;
    const total = Number(order.totalAmount);
    const paid = Number(order.paidAmount);
    return total > 0 ? (paid / total) * 100 : 0;
  };

  const handleDelete = async () => {
    if (!order) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить заявку ${order.orderNumber}?`)) {
      return;
    }

    try {
      await ordersApi.deleteOrder(order.id);
      alert('Заявка успешно удалена');
      navigate('/orders');
    } catch (err: any) {
      alert(`Ошибка удаления: ${err.message}`);
    }
  };

  // Обработчик регистрации оплаты
  const handlePaymentSubmit = async (amount: number, comment?: string) => {
    if (!order) return;

    try {
      setPaymentLoading(true);
      const response = await ordersApi.updateOrderPayment(order.id, amount, comment);
      
      // Полная перезагрузка заказа для обновления всех связанных данных
      await loadOrder();
      
      alert(`Оплата успешно зарегистрирована! ${response.payment.statusChanged ? `Статус изменен на "${response.payment.newStatus}"` : ''}`);
      setShowPaymentModal(false);
    } catch (error: any) {
      console.error('Ошибка регистрации оплаты:', error);
      alert(error.message || 'Ошибка при регистрации оплаты');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h2>
            <p className="text-gray-600 mb-6">{error || 'Заявка не найдена'}</p>
            <button
              onClick={() => navigate('/orders')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Вернуться к списку
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Модальное окно смены статуса */}
      {order && (
        <ChangeOrderStatusModal
          isOpen={showChangeStatusModal}
          onClose={() => setShowChangeStatusModal(false)}
          onSuccess={() => {
            loadOrder();
            alert('Статус успешно изменен!');
          }}
          orderId={order.id}
          currentStatus={order.status}
          orderNumber={order.orderNumber}
        />
      )}

      {/* Модальное окно оплаты */}
      {order && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handlePaymentSubmit}
          order={order}
          loading={paymentLoading}
        />
      )}

      {/* Шапка */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться к списку заявок
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Заявка {order.orderNumber}
                </h1>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {order.creator?.name}
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex items-center gap-2">
              {order.status === 'В работе' && (
                <>
                  <button
                    onClick={() => alert('Функция редактирования в разработке')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Редактировать
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </>
              )}
              
              {/* Кнопка обновления цен */}
              {order.items && order.items.length > 0 && (
                <button
                  onClick={() => setShowUpdatePricesModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  title="Обновить базовые цены товаров на основе этой заявки"
                >
                  <TrendingUp className="w-4 h-4" />
                  Обновить цены товаров
                </button>
              )}
              
              <button
                onClick={() => setShowChangeStatusModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Package className="w-4 h-4" />
                Изменить статус
              </button>
              
              {/* Кнопка оплаты - показываем только если заявка не полностью оплачена */}
              {order.paymentStatus !== 'Оплачено' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Зарегистрировать оплату
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Информация о поставщике */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Поставщик</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Название</p>
                <p className="text-lg font-medium text-gray-900">{order.supplier?.name}</p>
              </div>
              {order.supplier?.address && (
                <div>
                  <p className="text-sm text-gray-600">Адрес</p>
                  <p className="text-gray-900">{order.supplier.address}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                {order.supplier?.phone && (
                  <a
                    href={`tel:${order.supplier.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Позвонить
                  </a>
                )}
                {order.supplier?.whatsapp && (
                  <a
                    href={`https://wa.me/${order.supplier.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Товары в заявке */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Товары</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Товар
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Количество
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Цена
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.product?.name}</div>
                        <div className="text-sm text-gray-500">{item.product?.article}</div>
                        {item.notes && (
                          <div className="text-sm text-gray-600 mt-1">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {Number(item.priceAtPurchase).toLocaleString('ru-RU')} ₸
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {Number(item.totalPrice).toLocaleString('ru-RU')} ₸
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">
                      Итого:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-xl text-blue-600">
                      {Number(order.totalAmount).toLocaleString('ru-RU')} ₸
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* История статусов */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">История изменений</h2>
            <div className="space-y-4">
              {order.statusHistory?.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getStatusIcon(history.newStatus)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {history.oldStatus && (
                        <>
                          <span className="text-sm text-gray-600">{history.oldStatus}</span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className="text-sm font-medium text-gray-900">{history.newStatus}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {history.changer?.name} • {new Date(history.changedAt).toLocaleString('ru-RU')}
                    </div>
                    {history.comment && (
                      <div className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                        {history.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* История платежей */}
          {payments.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">История платежей</h2>
              <div className="space-y-3">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold text-green-600">
                          {Number(payment.amount).toLocaleString('ru-RU')} ₸
                        </span>
                        {payment.paymentMethod && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {payment.paymentMethod}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {payment.creator?.name} • {new Date(payment.createdAt).toLocaleString('ru-RU')}
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-gray-700 mt-1 bg-white p-2 rounded">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Финансы */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Финансы</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Общая сумма</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Number(order.totalAmount).toLocaleString('ru-RU')} ₸
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Оплачено</p>
                <p className="text-xl font-semibold text-green-600">
                  {Number(order.paidAmount).toLocaleString('ru-RU')} ₸
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Остаток</p>
                <p className="text-xl font-semibold text-red-600">
                  {(Number(order.totalAmount) - Number(order.paidAmount)).toLocaleString('ru-RU')} ₸
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Прогресс оплаты</p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${calculatePaymentProgress()}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1 text-right">
                  {calculatePaymentProgress().toFixed(0)}%
                </p>
              </div>

              <div className={`text-center py-2 px-4 rounded-lg font-medium ${
                order.paymentStatus === 'Оплачено'
                  ? 'bg-green-100 text-green-800'
                  : order.paymentStatus === 'Частично оплачено'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {order.paymentStatus}
              </div>
            </div>
          </div>

          {/* Доставка */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Доставка</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Место доставки</p>
                  <p className="font-medium text-gray-900">{order.deliveryLocation}</p>
                </div>
              </div>
              
              {order.expectedDeliveryDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ожидаемая дата</p>
                    <p className="font-medium text-gray-900">
                      {new Date(order.expectedDeliveryDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Комментарии */}
          {order.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Комментарии
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Модальное окно обновления цен товаров */}
        {order && (
          <UpdatePricesFromOrderModal
            isOpen={showUpdatePricesModal}
            onClose={() => setShowUpdatePricesModal(false)}
            onSuccess={() => {
              setShowUpdatePricesModal(false);
              // Можно добавить toast-уведомление
              alert('Цены товаров успешно обновлены!');
            }}
            order={order}
          />
        )}
      </div>
    </Layout>
  );
};

export default OrderDetails;
