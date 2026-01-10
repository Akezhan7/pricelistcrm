import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  MapPin,
  Warehouse,
  RefreshCw,
  CreditCard,
  Send,
  CheckCircle,
  AlertTriangle,
  Archive
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import ordersApi from '../services/ordersApi';
import CreateOrderModal from '../components/CreateOrderModal';
import PaymentModal from '../components/PaymentModal';
import type { Order, OrderFilters, OrderStats, OrderStatus, PaymentStatus } from '../types';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Проверка прав доступа
  const canCreateOrders = user?.role === 'admin' || user?.role === 'purchase_manager';
  const canManagePayments = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 'purchase_manager';
  
  // Состояния
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Фильтры
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 20,
    status: undefined,
    paymentStatus: undefined,
    search: ''
  });
  
  // Пагинация
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20
  });

  // Загрузка заявок
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ordersApi.getOrders(filters);
      setOrders(response.orders);
      setPagination(response.pagination);
      setStats(response.stats);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки заявок');
      console.error('Ошибка загрузки заявок:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filters]);

  // Обработчики фильтров
  const handleStatusFilter = (status?: OrderStatus) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handlePaymentStatusFilter = (paymentStatus?: PaymentStatus) => {
    setFilters(prev => ({ ...prev, paymentStatus, page: 1 }));
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadOrders();
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Обработчик открытия модального окна оплаты
  const handlePaymentClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // Предотвращаем переход к деталям заявки
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  // Обработчик регистрации оплаты
  const handlePaymentSubmit = async (amount: number, comment?: string) => {
    if (!selectedOrder) return;

    try {
      setPaymentLoading(true);
      const response = await ordersApi.updateOrderPayment(selectedOrder.id, amount, comment);
      
      // Обновляем заявку в списке
      setOrders(prev => prev.map(order => 
        order.id === selectedOrder.id 
          ? response.order 
          : order
      ));

      // Обновляем статистику
      loadOrders();

      alert(`Оплата успешно зарегистрирована! ${response.payment.statusChanged ? `Статус изменен на "${response.payment.newStatus}"` : ''}`);
    } catch (error: any) {
      console.error('Ошибка регистрации оплаты:', error);
      alert(error.message || 'Ошибка при регистрации оплаты');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Цветовые схемы для статусов
  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      'Создана': 'bg-gray-100 text-gray-800',
      'Отправлена поставщику': 'bg-blue-100 text-blue-800',
      'Частично подтверждена': 'bg-yellow-100 text-yellow-800',
      'Подтверждена': 'bg-green-100 text-green-800',
      'В сборе': 'bg-purple-100 text-purple-800',
      'Забрана': 'bg-indigo-100 text-indigo-800',
      'Принята на складе': 'bg-teal-100 text-teal-800',
      'Закрыта': 'bg-gray-200 text-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    const colors = {
      'Не оплачено': 'bg-red-100 text-red-800',
      'Частично оплачено': 'bg-orange-100 text-orange-800',
      'Оплачено': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons: Record<OrderStatus, React.ReactElement> = {
      'Создана': <FileText className="w-4 h-4" />,
      'Отправлена поставщику': <Send className="w-4 h-4" />,
      'Частично подтверждена': <AlertTriangle className="w-4 h-4" />,
      'Подтверждена': <CheckCircle className="w-4 h-4" />,
      'В сборе': <Package className="w-4 h-4" />,
      'Забрана': <Truck className="w-4 h-4" />,
      'Принята на складе': <Warehouse className="w-4 h-4" />,
      'Закрыта': <Archive className="w-4 h-4" />
    };
    return icons[status];
  };

  return (
    <Layout>
      {/* Модальное окно создания заявки */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadOrders();
          alert('Заявка успешно создана!');
        }}
      />

      {/* Модальное окно оплаты */}
      {selectedOrder && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          onSubmit={handlePaymentSubmit}
          order={selectedOrder}
          loading={paymentLoading}
        />
      )}

      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Заявки
            </h1>
            <p className="text-gray-600 mt-1">Управление заявками на поставку товаров</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadOrders}
              className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors border border-gray-300"
              title="Обновить список"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {canCreateOrders && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Создать заявку
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {/* Ожидают обработки */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-gray-400"
            onClick={() => handleStatusFilter('Создана')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Созданы</p>
                <p className="text-2xl font-bold text-gray-600">{stats.created || 0}</p>
              </div>
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          
          {/* Отправлены */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-blue-400"
            onClick={() => handleStatusFilter('Отправлена поставщику')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Отправлены</p>
                <p className="text-2xl font-bold text-blue-600">{stats.sentToSupplier || 0}</p>
              </div>
              <Send className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          
          {/* Подтверждены */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-green-400"
            onClick={() => handleStatusFilter('Подтверждена')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Подтверждены</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed || 0}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
          
          {/* В сборе */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-purple-400"
            onClick={() => handleStatusFilter('В сборе')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">В сборе</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inCollection || 0}</p>
              </div>
              <Package className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          
          {/* Забраны */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-indigo-400"
            onClick={() => handleStatusFilter('Забрана')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Забраны</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.collected || 0}</p>
              </div>
              <Truck className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          
          {/* Приняты */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-teal-400"
            onClick={() => handleStatusFilter('Принята на складе')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Приняты</p>
                <p className="text-2xl font-bold text-teal-600">{stats.received || 0}</p>
              </div>
              <Warehouse className="w-6 h-6 text-teal-400" />
            </div>
          </div>

          {/* Закрыты */}
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow border-l-4 border-gray-300"
            onClick={() => handleStatusFilter('Закрыта')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Закрыты</p>
                <p className="text-2xl font-bold text-gray-500">{stats.closed || 0}</p>
              </div>
              <Archive className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Финансовая сводка */}
      {stats && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-500">Общая сумма:</span>
                <span className="ml-2 text-lg font-semibold text-gray-900">
                  {parseFloat(stats.totalAmount).toLocaleString('ru-RU')} ₸
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Оплачено:</span>
                <span className="ml-2 text-lg font-semibold text-green-600">
                  {parseFloat(stats.totalPaid).toLocaleString('ru-RU')} ₸
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Задолженность:</span>
                <span className={`ml-2 text-lg font-semibold ${parseFloat(stats.totalDebt) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {parseFloat(stats.totalDebt).toLocaleString('ru-RU')} ₸
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                Ожидают: {stats.pending || 0}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                В работе: {stats.inProgress || 0}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                Завершены: {stats.completed || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Поиск и фильтры */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск по номеру заявки..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Искать
          </button>
          
          {(filters.status || filters.paymentStatus || filters.search) && (
            <button
              type="button"
              onClick={() => setFilters({ page: 1, limit: 20 })}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
            >
              Сбросить
            </button>
          )}
        </form>

        {/* Быстрые фильтры по статусу оплаты */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handlePaymentStatusFilter(undefined)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              !filters.paymentStatus ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => handlePaymentStatusFilter('Не оплачено')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filters.paymentStatus === 'Не оплачено' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Не оплачено
          </button>
          <button
            onClick={() => handlePaymentStatusFilter('Частично оплачено')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filters.paymentStatus === 'Частично оплачено' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Частично оплачено
          </button>
          <button
            onClick={() => handlePaymentStatusFilter('Оплачено')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filters.paymentStatus === 'Оплачено' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Оплачено
          </button>
        </div>
      </div>

      {/* Таблица заявок */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-red-600">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p>{error}</p>
            <button
              onClick={loadOrders}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Попробовать снова
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mb-2" />
            <p>Заявки не найдены</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Номер
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Поставщик
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата создания
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Оплата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.supplier?.name}</div>
                      <div className="text-sm text-gray-500">{order.supplier?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {Number(order.totalAmount).toLocaleString('ru-RU')} ₸
                      </div>
                      {Number(order.paidAmount) > 0 && (
                        <div className="text-xs text-gray-500">
                          оплачено: {Number(order.paidAmount).toLocaleString('ru-RU')} ₸
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {/* Кнопка оплаты - показываем только если есть права и заявка не полностью оплачена */}
                        {canManagePayments && order.paymentStatus !== 'Оплачено' && (
                          <button
                            onClick={(e) => handlePaymentClick(e, order)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            title="Зарегистрировать оплату"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Оплатить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Пагинация */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Показано <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> до{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      из <span className="font-medium">{pagination.total}</span> результатов
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Страница {pagination.page} из {pagination.pages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
