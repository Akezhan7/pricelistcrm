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
  TrendingUp,
  Download,
  Printer,
  Send,
  CheckCircle,
  UserPlus,
  ClipboardCheck
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import ordersApi from '../services/ordersApi';
import ChangeOrderStatusModal from '../components/ChangeOrderStatusModal';
import PaymentModal from '../components/PaymentModal';
import { UpdatePricesFromOrderModal } from '../components/UpdatePricesFromOrderModal';
import EditOrderModal from '../components/EditOrderModal';
import { generateOrderPDF } from '../utils/pdfGenerator';
import type { Order, OrderStatus } from '../types';

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Проверка прав доступа
  const canEditOrders = user?.role === 'admin' || user?.role === 'purchase_manager';
  const canDeleteOrders = user?.role === 'admin';
  const canManagePayments = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 'purchase_manager';
  const canConfirmOrders = user?.role === 'admin' || user?.role === 'purchase_manager';
  const canAssignCollector = user?.role === 'admin' || user?.role === 'purchase_manager' || user?.role === 'warehouse_operator';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdatePricesModal, setShowUpdatePricesModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [confirmationItems, setConfirmationItems] = useState<{[key: number]: number}>({});
  const [showCollectorAssign, setShowCollectorAssign] = useState(false);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState<number | null>(null);

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
    const colors: Record<string, string> = {
      'Создана': 'bg-gray-100 text-gray-800 border-gray-200',
      'Отправлена поставщику': 'bg-blue-100 text-blue-800 border-blue-200',
      'Частично подтверждена': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Подтверждена': 'bg-green-100 text-green-800 border-green-200',
      'В сборе': 'bg-purple-100 text-purple-800 border-purple-200',
      'Забрана': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Принята на складе': 'bg-teal-100 text-teal-800 border-teal-200',
      'Закрыта': 'bg-gray-200 text-gray-600 border-gray-300',
      // Старые статусы для обратной совместимости
      'В работе': 'bg-blue-100 text-blue-800 border-blue-200',
      'На точке': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'В пути': 'bg-purple-100 text-purple-800 border-purple-200',
      'На складе': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons: Record<string, React.ReactNode> = {
      'Создана': <FileText className="w-5 h-5" />,
      'Отправлена поставщику': <Send className="w-5 h-5" />,
      'Частично подтверждена': <ClipboardCheck className="w-5 h-5" />,
      'Подтверждена': <CheckCircle className="w-5 h-5" />,
      'В сборе': <UserPlus className="w-5 h-5" />,
      'Забрана': <Truck className="w-5 h-5" />,
      'Принята на складе': <Warehouse className="w-5 h-5" />,
      'Закрыта': <Package className="w-5 h-5" />,
      // Старые статусы
      'В работе': <Package className="w-5 h-5" />,
      'На точке': <MapPin className="w-5 h-5" />,
      'В пути': <Truck className="w-5 h-5" />,
      'На складе': <Warehouse className="w-5 h-5" />
    };
    return icons[status] || <Package className="w-5 h-5" />;
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

  // Обработчик скачивания PDF
  const handleDownloadPDF = async () => {
    if (!order) return;
    
    try {
      await generateOrderPDF(order);
    } catch (error: any) {
      console.error('Ошибка генерации PDF:', error);
      alert('Ошибка при создании PDF документа');
    }
  };

  // Обработчик отправки в WhatsApp
  const handleSendToWhatsApp = async () => {
    if (!order || !order.supplier?.whatsapp) {
      alert('У поставщика не указан номер WhatsApp');
      return;
    }

    try {
      setWhatsappLoading(true);
      const response = await ordersApi.sendToWhatsApp(order.id);
      window.open(response.deepLink, '_blank');
    } catch (error: any) {
      console.error('Ошибка генерации WhatsApp сообщения:', error);
      alert('Ошибка при создании WhatsApp сообщения');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Обработчик подтверждения заявки поставщиком
  const handleConfirmOrder = async (isPartial: boolean = false) => {
    if (!order) return;

    try {
      if (isPartial) {
        // Частичное подтверждение
        const items = Object.entries(confirmationItems).map(([productId, quantity]) => ({
          productId: parseInt(productId),
          confirmedQuantity: quantity,
          isAvailable: true
        }));

        await ordersApi.partialConfirm(order.id, { items });
        alert('Заявка частично подтверждена поставщиком');
      } else {
        // Полное подтверждение
        await ordersApi.confirmOrder(order.id);
        alert('Заявка полностью подтверждена поставщиком');
      }

      setShowConfirmationForm(false);
      setConfirmationItems({});
      loadOrder();
    } catch (error: any) {
      console.error('Ошибка подтверждения заявки:', error);
      alert('Ошибка при подтверждении заявки');
    }
  };

  // Обработчик назначения сборщика
  const handleAssignCollector = async () => {
    if (!order || !selectedCollectorId) {
      alert('Выберите сборщика');
      return;
    }

    try {
      await ordersApi.assignCollector(order.id, { collectorId: selectedCollectorId });
      alert('Сборщик успешно назначен');
      setShowCollectorAssign(false);
      setSelectedCollectorId(null);
      loadOrder();
    } catch (error: any) {
      console.error('Ошибка назначения сборщика:', error);
      alert('Ошибка при назначении сборщика');
    }
  };

  // Загрузка списка сборщиков
  useEffect(() => {
    const loadCollectors = async () => {
      try {
        // Динамически импортируем usersApi чтобы избежать циклических зависимостей
        const usersApi = (await import('../services/usersApi')).default;
        const users = await usersApi.getCollectors();
        setCollectors(users);
      } catch (error) {
        console.error('Ошибка загрузки сборщиков:', error);
        // Если API не работает, показываем пустой список
        setCollectors([]);
      }
    };

    if (showCollectorAssign) {
      loadCollectors();
    }
  }, [showCollectorAssign]);

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
            <div className="flex items-center gap-2 flex-wrap">
              {/* Основные действия по статусу */}
              {order.status === 'Создана' && (
                <>
                  {canEditOrders && order.supplier?.whatsapp && (
                    <button
                      onClick={handleSendToWhatsApp}
                      disabled={whatsappLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {whatsappLoading ? 'Загрузка...' : 'WhatsApp'}
                    </button>
                  )}
                  {canEditOrders && (
                    <button
                      onClick={() => setShowEditOrderModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </button>
                  )}
                  {canDeleteOrders && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  )}
                </>
              )}

              {canConfirmOrders && order.status === 'Отправлена поставщику' && (
                <>
                  <button
                    onClick={() => handleConfirmOrder(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Подтверждено
                  </button>
                  <button
                    onClick={() => setShowConfirmationForm(!showConfirmationForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Частично
                  </button>
                </>
              )}

              {canAssignCollector && ['Подтверждена', 'Частично подтверждена'].includes(order.status) && (
                <button
                  onClick={() => setShowCollectorAssign(!showCollectorAssign)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Назначить сборщика
                </button>
              )}

              {/* Общие кнопки */}
              {canEditOrders && !['Закрыта'].includes(order.status) && (
                <button
                  onClick={() => setShowChangeStatusModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Изменить статус
                </button>
              )}
              
              {canManagePayments && order.paymentStatus !== 'Оплачено' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Зарегистрировать оплату
                </button>
              )}

              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Скачать PDF
              </button>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Товары</h2>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                title="Скачать заявку в PDF"
              >
                <Download className="w-4 h-4" />
                Скачать PDF
              </button>
            </div>
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
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.product?.name}</div>
                            <div className="text-sm text-gray-500">{item.product?.article}</div>
                            {item.variation && (
                              <div className="mt-1 inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                <span className="mr-1">🔹</span>
                                {item.variation.name}: <span className="font-semibold ml-1">{item.variation.value}</span>
                                {item.variation.sku && (
                                  <span className="text-blue-600 ml-2 opacity-75">({item.variation.sku})</span>
                                )}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-sm text-gray-600 mt-1 italic">📝 {item.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {Number(item.priceAtPurchase).toLocaleString('ru-RU')} ₸
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
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

          {/* Форма частичного подтверждения */}
          {showConfirmationForm && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Частичное подтверждение</h3>
              <p className="text-sm text-gray-600 mb-4">
                Укажите фактическое количество по каждой позиции, которое подтвердил поставщик
              </p>
              
              <div className="space-y-3">
                {order.items?.map((item) => {
                  if (!item.product) return null;
                  const productId = item.product.id;
                  const confirmedQty = confirmationItems[productId] ?? item.quantity;
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.product.internalName || item.product.name}</div>
                        <div className="text-sm text-gray-500">Запрошено: {item.quantity} шт</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Подтверждено:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={confirmedQty}
                          onChange={(e) => setConfirmationItems(prev => ({
                            ...prev,
                            [productId]: parseInt(e.target.value) || 0
                          }))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowConfirmationForm(false);
                    setConfirmationItems({});
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleConfirmOrder(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Подтвердить частично
                </button>
              </div>
            </div>
          )}

          {/* Форма назначения сборщика */}
          {showCollectorAssign && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Назначить сборщика</h3>
              <p className="text-sm text-gray-600 mb-4">
                Выберите сотрудника, который будет забирать товар у поставщика
              </p>

              <div className="space-y-2 mb-4">
                {collectors.map(collector => (
                  <label
                    key={collector.id}
                    className="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="collector"
                      value={collector.id}
                      checked={selectedCollectorId === collector.id}
                      onChange={() => setSelectedCollectorId(collector.id)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-gray-900 font-medium">{collector.name}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCollectorAssign(false);
                    setSelectedCollectorId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAssignCollector}
                  disabled={!selectedCollectorId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Назначить
                </button>
              </div>
            </div>
          )}

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
          <>
            <UpdatePricesFromOrderModal
              isOpen={showUpdatePricesModal}
              onClose={() => setShowUpdatePricesModal(false)}
              onSuccess={() => {
                setShowUpdatePricesModal(false);
                alert('Цены товаров успешно обновлены!');
              }}
              order={order}
            />

            {/* Модальное окно редактирования заявки */}
            <EditOrderModal
              isOpen={showEditOrderModal}
              onClose={() => setShowEditOrderModal(false)}
              onSuccess={() => {
                loadOrder();
                alert('Заявка успешно обновлена!');
              }}
              order={order}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default OrderDetails;
