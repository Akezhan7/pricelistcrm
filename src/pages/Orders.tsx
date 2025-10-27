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
  CreditCard
} from 'lucide-react';
import { Layout } from '../components/Layout';
import ordersApi from '../services/ordersApi';
import CreateOrderModal from '../components/CreateOrderModal';
import PaymentModal from '../components/PaymentModal';
import type { Order, OrderFilters, OrderStats, OrderStatus, PaymentStatus } from '../types';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  
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
    const colors = {
      'В работе': 'bg-blue-100 text-blue-800',
      'На точке': 'bg-yellow-100 text-yellow-800',
      'В пути': 'bg-purple-100 text-purple-800',
      'На складе': 'bg-green-100 text-green-800'
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
    const icons = {
      'В работе': <Package className="w-4 h-4" />,
      'На точке': <MapPin className="w-4 h-4" />,
      'В пути': <Truck className="w-4 h-4" />,
      'На складе': <Warehouse className="w-4 h-4" />
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Создать заявку
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusFilter('В работе')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">В работе</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusFilter('На точке')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">На точке</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.atLocation}</p>
              </div>
              <MapPin className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusFilter('В пути')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">В пути</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inTransit}</p>
              </div>
              <Truck className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatusFilter('На складе')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">На складе</p>
                <p className="text-2xl font-bold text-green-600">{stats.atWarehouse}</p>
              </div>
              <Warehouse className="w-8 h-8 text-green-600" />
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
                        {/* Кнопка оплаты - показываем только если заявка не полностью оплачена */}
                        {order.paymentStatus !== 'Оплачено' && (
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
