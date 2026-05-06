import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import warehouseApi from '../services/warehouseApi';
import { Order } from '../types';
import { Package, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';

interface ReceiptItem {
  productId: number;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  notes: string;
}

export const WarehouseReceipt: React.FC = () => {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadPendingOrders();
  }, [pagination.page]);

  const loadPendingOrders = async () => {
    try {
      setLoading(true);
      const data = await warehouseApi.getPendingReceipts({
        page: pagination.page,
        limit: pagination.limit
      });
      setPendingOrders(data.orders);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
      alert('Не удалось загрузить заявки на приёмку');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    setSelectedOrder(null);
  };

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    const items: ReceiptItem[] = order.items?.map(item => ({
      productId: item.product?.id || 0,
      productName: item.product?.internalName || item.product?.name || 'Неизвестный товар',
      expectedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      notes: '',
    })) || [];
    setReceiptItems(items);
    setGeneralNotes('');
  };

  const updateReceivedQuantity = (productId: number, value: string) => {
    const quantity = parseInt(value) || 0;
    setReceiptItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, receivedQuantity: quantity }
          : item
      )
    );
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setReceiptItems(items =>
      items.map(item =>
        item.productId === productId ? { ...item, notes } : item
      )
    );
  };

  const handleAcceptFull = async () => {
    if (!selectedOrder) return;

    const hasDiscrepancies = receiptItems.some(
      item => item.receivedQuantity !== item.expectedQuantity
    );

    if (hasDiscrepancies) {
      if (!window.confirm('Обнаружены расхождения! Принять полностью всё равно?')) {
        return;
      }
    }

    await submitReceipt('full');
  };

  const handleAcceptPartial = async () => {
    if (!selectedOrder) return;

    const hasDiscrepancies = receiptItems.some(
      item => item.receivedQuantity !== item.expectedQuantity
    );

    if (!hasDiscrepancies) {
      alert('Расхождений нет. Используйте "Принять полностью".');
      return;
    }

    await submitReceipt('partial');
  };

  const submitReceipt = async (type: 'full' | 'partial') => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);

      const items = receiptItems.map(item => ({
        productId: item.productId,
        expectedQuantity: item.expectedQuantity,
        receivedQuantity: item.receivedQuantity,
        notes: item.notes,
      }));

      await warehouseApi.receiveOrder(selectedOrder.id, {
        receiptType: type,
        items,
        notes: generalNotes,
      });

      alert('Приёмка завершена успешно!');
      setSelectedOrder(null);
      setReceiptItems([]);
      setGeneralNotes('');
      loadPendingOrders();
    } catch (error) {
      console.error('Ошибка приёмки:', error);
      alert('Не удалось провести приёмку');
    } finally {
      setSubmitting(false);
    }
  };

  const getDiscrepancyBadge = (item: ReceiptItem) => {
    const diff = item.receivedQuantity - item.expectedQuantity;
    
    if (diff === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
          <CheckCircle className="w-3 h-3 mr-1" />
          Совпадает
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {diff > 0 ? `+${diff}` : diff} шт
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Приёмка товара</h1>
        <p className="text-gray-600 mt-1">Сверка и приём товара от поставщиков</p>
      </div>

      {!selectedOrder ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Заявки, ожидающие приёмки
            </h2>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Нет заявок на приёмку</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => selectOrder(order)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Заявка #{order.orderNumber}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Поставщик:</strong>{' '}
                          {order.supplier?.name || 'Не указан'}
                        </p>
                        <p>
                          <strong>Товаров:</strong> {order.items?.length || 0} позиций
                        </p>
                        <p>
                          <strong>Сумма:</strong> {order.totalAmount?.toLocaleString()} ₸
                        </p>
                      </div>
                    </div>

                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Принять
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Пагинация */}
          {pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Заголовок заявки */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Заявка #{selectedOrder.orderNumber}
                </h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>Поставщик:</strong> {selectedOrder.supplier?.name}
                  </p>
                  <p>
                    <strong>Статус:</strong> {selectedOrder.status}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Назад к списку
              </button>
            </div>
          </div>

          {/* Таблица товаров */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Сверка товаров</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Товар
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Ожидается
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Получено
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Комментарий
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {receiptItems.map(item => (
                    <tr key={item.productId}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {item.productName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-900 font-medium">
                          {item.expectedQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          value={item.receivedQuantity}
                          onChange={e =>
                            updateReceivedQuantity(item.productId, e.target.value)
                          }
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getDiscrepancyBadge(item)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Edit3 className="w-4 h-4 text-gray-400 mr-2" />
                          <input
                            type="text"
                            placeholder="Комментарий..."
                            value={item.notes}
                            onChange={e =>
                              updateItemNotes(item.productId, e.target.value)
                            }
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Общий комментарий */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Общий комментарий к приёмке
            </label>
            <textarea
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              rows={3}
              placeholder="Дополнительные замечания, проблемы, особенности..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Кнопки действий */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setSelectedOrder(null)}
                disabled={submitting}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>

              <button
                onClick={handleAcceptPartial}
                disabled={submitting}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                {submitting ? 'Обработка...' : 'Принять с расхождениями'}
              </button>

              <button
                onClick={handleAcceptFull}
                disabled={submitting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {submitting ? 'Обработка...' : 'Принять полностью'}
              </button>
            </div>

            {/* Подсказка */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Совет:</strong> Используйте "Принять полностью", если все количества совпадают.
                Если есть расхождения, укажите фактическое количество и используйте "Принять с расхождениями".
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
