import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import { 
  Package, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ShoppingCart,
  TrendingDown,
  Search,
  X,
  Plus,
  MessageCircle
} from 'lucide-react';
import analyticsApi from '../services/analyticsApi';
import categoryApi from '../services/categoryApi';
import ordersApi from '../services/ordersApi';
import type { StockAnalytics, Category, StockStatus } from '../types';
import getImageUrl from '../utils/image';
import { useNavigate } from 'react-router-dom';

export const StockDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<StockAnalytics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StockStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<any>(null);
  const [creatingOrders, setCreatingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, categoriesData] = await Promise.all([
        analyticsApi.getStockAnalytics(selectedCategory ? { categoryId: selectedCategory } : undefined),
        categoryApi.getCategories({ isActive: true })
      ]);
      setAnalytics(analyticsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Ошибка загрузки аналитики остатков:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'good':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <TrendingDown className="h-4 w-4" />;
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: StockStatus) => {
    switch (status) {
      case 'critical':
        return 'Критический';
      case 'low':
        return 'Низкий';
      case 'medium':
        return 'Средний';
      case 'good':
        return 'Хороший';
    }
  };

  const getFilteredProducts = () => {
    if (!analytics) return [];

    let products = [];
    if (selectedStatus === 'all') {
      products = [
        ...analytics.critical,
        ...analytics.low,
        ...analytics.medium,
        ...analytics.good
      ];
    } else {
      products = analytics[selectedStatus];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        p => 
          p.name.toLowerCase().includes(query) ||
          p.internalName?.toLowerCase().includes(query) ||
          p.article.toLowerCase().includes(query)
      );
    }

    return products;
  };

  const getPaginatedProducts = () => {
    const filteredProducts = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedCategory, searchQuery]);

  const handleGeneratePurchaseList = async () => {
    try {
      const response = await analyticsApi.getPurchaseSuggestions();
      setPurchaseSuggestions(response);
      setShowPurchaseModal(true);
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций:', error);
      alert('Ошибка при формировании списка закупа');
    }
  };

  const handleCreateOrdersFromSuggestions = async () => {
    if (!purchaseSuggestions?.bySupplier || purchaseSuggestions.bySupplier.length === 0) {
      alert('Нет товаров для закупа');
      return;
    }

    try {
      setCreatingOrders(true);
      
      const createdOrders = [];
      for (const supplierData of purchaseSuggestions.bySupplier) {
        const items = supplierData.products.map((product: any) => ({
          productId: product.id,
          quantity: product.suggestedQuantity,
          priceAtPurchase: product.costPrice || 0
        }));

        const orderData = {
          supplierId: supplierData.supplier.id,
          items,
          deliveryLocation: 'Склад',
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        const order = await ordersApi.createOrder(orderData);
        createdOrders.push(order);
      }

      alert(`Создано ${createdOrders.length} заявок на закуп`);
      setShowPurchaseModal(false);
      
      if (createdOrders.length === 1) {
        navigate(`/orders/${createdOrders[0].id}`);
      } else {
        navigate('/orders');
      }
    } catch (error: any) {
      console.error('Ошибка создания заявок:', error);
      alert(error.message || 'Ошибка при создании заявок');
    } finally {
      setCreatingOrders(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Не удалось загрузить данные</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Остатки на складе</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить
            </button>
            <button
              onClick={handleGeneratePurchaseList}
              className="btn-primary flex items-center gap-2"
              disabled={analytics.stats.criticalCount === 0 && analytics.stats.lowCount === 0}
            >
              <ShoppingCart className="h-4 w-4" />
              Сформировать закуп
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Критический</p>
                <p className="text-2xl font-bold text-red-700">{analytics.stats.criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Низкий</p>
                <p className="text-2xl font-bold text-yellow-700">{analytics.stats.lowCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Средний</p>
                <p className="text-2xl font-bold text-orange-700">{analytics.stats.mediumCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Хороший</p>
                <p className="text-2xl font-bold text-green-700">{analytics.stats.goodCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск товара..."
                className="input-field pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Фильтр по статусу */}
            <div>
              <select
                className="input-field"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StockStatus | 'all')}
              >
                <option value="all">Все статусы</option>
                <option value="critical">Критический</option>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="good">Хороший</option>
              </select>
            </div>

            {/* Фильтр по категории */}
            <div>
              <select
                className="input-field"
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Таблица товаров */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Товар
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Артикул
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Текущий остаток
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Мин. порог
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getPaginatedProducts().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Товары не найдены
                    </td>
                  </tr>
                ) : (
                  getPaginatedProducts().map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image) || undefined}
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.onerror = null;
                                el.src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.internalName || product.name}
                            </div>
                            {product.internalName && (
                              <div className="text-xs text-gray-500">{product.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.article}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category?.name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {product.currentStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {product.minStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            product.stockStatus
                          )}`}
                        >
                          {getStatusIcon(product.stockStatus)}
                          {getStatusLabel(product.stockStatus)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Пагинация */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(getFilteredProducts().length / itemsPerPage)}
            totalItems={getFilteredProducts().length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Информация о результатах */}
        <div className="text-sm text-gray-500 text-center">
          Всего товаров: {analytics.stats.totalProducts}
        </div>
      </div>

      {/* Модальное окно рекомендаций закупа */}
      {showPurchaseModal && purchaseSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Рекомендации для закупки</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Найдено {purchaseSuggestions.statistics.total} товаров, требующих закупа
                </p>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {purchaseSuggestions.bySupplier.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет товаров для закупа</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Все товары имеют достаточный остаток на складе
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseSuggestions.bySupplier.map((supplierData: any) => (
                    <div key={supplierData.supplier.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{supplierData.supplier.name}</h3>
                            <p className="text-sm text-gray-500">
                              {supplierData.products.length} товаров • Сумма: ~{Math.round(supplierData.totalEstimatedCost).toLocaleString('ru-RU')} ₸
                            </p>
                          </div>
                          {supplierData.supplier.whatsapp && (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <table className="w-full">
                          <thead className="text-xs text-gray-500">
                            <tr>
                              <th className="text-left pb-2">Товар</th>
                              <th className="text-center pb-2">Текущий</th>
                              <th className="text-center pb-2">Мин</th>
                              <th className="text-center pb-2">Рекомендуемо</th>
                              <th className="text-right pb-2">Цена</th>
                              <th className="text-right pb-2">Сумма</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {supplierData.products.map((product: any) => (
                              <tr key={product.id} className="border-t border-gray-100">
                                <td className="py-2">
                                  <div>
                                    <div className="font-medium text-gray-900">{product.internalName || product.name}</div>
                                    <div className="text-xs text-gray-500">{product.article}</div>
                                  </div>
                                </td>
                                <td className="text-center">
                                  <span className={`font-semibold ${product.currentStock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {product.currentStock}
                                  </span>
                                </td>
                                <td className="text-center text-gray-500">{product.minStock}</td>
                                <td className="text-center">
                                  <span className="font-semibold text-blue-600">{product.suggestedQuantity}</span>
                                </td>
                                <td className="text-right text-gray-600">
                                  {product.costPrice ? `${Math.round(product.costPrice).toLocaleString('ru-RU')} ₸` : '—'}
                                </td>
                                <td className="text-right font-semibold text-gray-900">
                                  {product.estimatedCost ? `${Math.round(product.estimatedCost).toLocaleString('ru-RU')} ₸` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {purchaseSuggestions.bySupplier.length > 0 && (
                  <>
                    Будет создано <strong>{purchaseSuggestions.bySupplier.length}</strong> заявок
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="btn-secondary"
                  disabled={creatingOrders}
                >
                  Отмена
                </button>
                {purchaseSuggestions.bySupplier.length > 0 && (
                  <button
                    onClick={handleCreateOrdersFromSuggestions}
                    className="btn-primary flex items-center gap-2"
                    disabled={creatingOrders}
                  >
                    {creatingOrders ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Создание...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Создать заявки
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
