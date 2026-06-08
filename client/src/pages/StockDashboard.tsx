import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';
import { useToast } from '../context/ToastContext';
import { getStockStatusColor } from '../theme/statusColors';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  Search,
  Plus,
  MessageCircle,
} from 'lucide-react';
import analyticsApi from '../services/analyticsApi';
import categoryApi from '../services/categoryApi';
import ordersApi from '../services/ordersApi';
import type { StockAnalytics, Category, StockStatus } from '../types';
import getImageUrl from '../utils/image';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

interface StatCardProps {
  label: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full rounded-xl border bg-brand-white p-4 text-left transition-all duration-150',
      'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2',
      active
        ? 'border-brand-yellow/40 border-l-[3px] border-l-brand-yellow bg-brand-yellow/10'
        : 'border-border-subtle hover:border-border'
    )}
  >
    <p className="text-caption font-medium text-text-muted">{label}</p>
    <p className="mt-1 text-h2 font-bold tabular-nums tracking-tight text-brand-black">{value}</p>
  </button>
);

const STATUS_STATS: { status: StockStatus | 'all'; label: string }[] = [
  { status: 'all', label: 'Все' },
  { status: 'critical', label: 'Критический' },
  { status: 'low', label: 'Низкий' },
  { status: 'medium', label: 'Средний' },
  { status: 'good', label: 'Хороший' },
];

export const StockDashboard: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
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
        categoryApi.getCategories({ isActive: true }),
      ]);
      setAnalytics(analyticsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Ошибка загрузки аналитики остатков:', error);
    } finally {
      setLoading(false);
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
        ...analytics.good,
      ];
    } else {
      products = analytics[selectedStatus];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
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
      toast.error('Ошибка при формировании списка закупа');
    }
  };

  const handleCreateOrdersFromSuggestions = async () => {
    if (!purchaseSuggestions?.bySupplier || purchaseSuggestions.bySupplier.length === 0) {
      toast.warning('Нет товаров для закупа');
      return;
    }

    try {
      setCreatingOrders(true);

      const createdOrders = [];
      for (const supplierData of purchaseSuggestions.bySupplier) {
        const items = supplierData.products.map((product: any) => ({
          productId: product.id,
          quantity: product.suggestedQuantity,
          priceAtPurchase: product.costPrice || 0,
        }));

        const orderData = {
          supplierId: supplierData.supplier.id,
          items,
          deliveryLocation: 'Склад',
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const order = await ordersApi.createOrder(orderData);
        createdOrders.push(order);
      }

      toast.success(`Создано ${createdOrders.length} заявок на закуп`);
      setShowPurchaseModal(false);

      if (createdOrders.length === 1) {
        navigate(`/orders/${createdOrders[0].id}`);
      } else {
        navigate('/orders');
      }
    } catch (error: any) {
      console.error('Ошибка создания заявок:', error);
      toast.error(error.message || 'Ошибка при создании заявок');
    } finally {
      setCreatingOrders(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" color="brand" useLucide />
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <EmptyState title="Не удалось загрузить данные" />
      </Layout>
    );
  }

  const filteredCount = getFilteredProducts().length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Остатки на складе"
          description="Мониторинг остатков и формирование закупок"
          icon={Package}
          actions={
            <>
              <IconButton icon={RefreshCw} title="Обновить" variant="default" onClick={loadData} />
              <Button
                variant="primary"
                leftIcon={ShoppingCart}
                onClick={handleGeneratePurchaseList}
                disabled={analytics.stats.criticalCount === 0 && analytics.stats.lowCount === 0}
              >
                Сформировать закуп
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {STATUS_STATS.map(({ status, label }) => (
            <StatCard
              key={status}
              label={label}
              value={
                status === 'all'
                  ? analytics.stats.totalProducts
                  : Number(analytics.stats[`${status}Count` as keyof typeof analytics.stats] ?? 0)
              }
              active={selectedStatus === status}
              onClick={() => setSelectedStatus(status)}
            />
          ))}
        </div>

        <Card variant="inset" className="shadow-none">
          <CardBody className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none"
                  aria-hidden
                />
                <Input
                  type="text"
                  placeholder="Поиск товара..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Поиск товара"
                />
              </div>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StockStatus | 'all')}
                aria-label="Фильтр по статусу"
              >
                <option value="all">Все статусы</option>
                <option value="critical">Критический</option>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="good">Хороший</option>
              </Select>
              <Select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                aria-label="Фильтр по категории"
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <Table>
            <TableHead sticky>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Товар</TableHeaderCell>
                <TableHeaderCell>Артикул</TableHeaderCell>
                <TableHeaderCell>Категория</TableHeaderCell>
                <TableHeaderCell className="text-center">Текущий остаток</TableHeaderCell>
                <TableHeaderCell className="text-center">Мин. порог</TableHeaderCell>
                <TableHeaderCell className="text-center">Статус</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getPaginatedProducts().length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12">
                    <EmptyState title="Товары не найдены" />
                  </TableCell>
                </TableRow>
              ) : (
                getPaginatedProducts().map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image) || undefined}
                            alt={product.name}
                            className="h-10 w-10 rounded-[10px] object-cover border border-border-subtle"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.onerror = null;
                              el.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-inset">
                            <Package className="h-5 w-5 text-text-muted" />
                          </div>
                        )}
                        <div>
                          <div className="text-body-medium text-brand-black">
                            {product.internalName || product.name}
                          </div>
                          {product.internalName && (
                            <div className="text-caption text-text-muted">{product.name}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-caption text-text-muted">{product.article}</TableCell>
                    <TableCell className="text-caption text-text-muted">
                      {product.category?.name || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-body-medium font-semibold tabular-nums text-brand-black">
                        {product.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-caption tabular-nums text-text-muted">
                      {product.minStock}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge statusClass={getStockStatusColor(product.stockStatus)}>
                        <span className="inline-flex items-center gap-1">
                          {getStatusIcon(product.stockStatus)}
                          {getStatusLabel(product.stockStatus)}
                        </span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredCount / itemsPerPage)}
            totalItems={filteredCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </Card>

        <p className="text-center text-caption text-text-muted">
          Всего товаров: {analytics.stats.totalProducts}
        </p>
      </div>

      <Modal
        isOpen={showPurchaseModal && !!purchaseSuggestions}
        onClose={() => setShowPurchaseModal(false)}
        title="Рекомендации для закупки"
        size="xl"
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-text-muted">
              {purchaseSuggestions?.bySupplier?.length > 0 && (
                <>
                  Будет создано{' '}
                  <strong className="text-brand-black">{purchaseSuggestions.bySupplier.length}</strong>{' '}
                  заявок
                </>
              )}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => setShowPurchaseModal(false)} disabled={creatingOrders}>
                Отмена
              </Button>
              {purchaseSuggestions?.bySupplier?.length > 0 && (
                <Button
                  variant="primary"
                  leftIcon={Plus}
                  onClick={handleCreateOrdersFromSuggestions}
                  loading={creatingOrders}
                  disabled={creatingOrders}
                >
                  Создать заявки
                </Button>
              )}
            </div>
          </div>
        }
      >
        {purchaseSuggestions?.bySupplier?.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Нет товаров для закупа"
            description="Все товары имеют достаточный остаток на складе"
          />
        ) : (
          <div className="space-y-4">
            <p className="text-caption text-text-muted">
              Найдено {purchaseSuggestions?.statistics?.total ?? 0} товаров, требующих закупа
            </p>
            {purchaseSuggestions?.bySupplier?.map((supplierData: any) => (
              <Card key={supplierData.supplier.id} variant="inset" className="shadow-none">
                <CardBody className="p-0">
                  <div className="border-b border-border-subtle px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-card-title text-brand-black">{supplierData.supplier.name}</h3>
                        <p className="mt-0.5 text-caption text-text-muted">
                          {supplierData.products.length} товаров • Сумма: ~
                          {Math.round(supplierData.totalEstimatedCost).toLocaleString('ru-RU')} ₸
                        </p>
                      </div>
                      {supplierData.supplier.whatsapp && (
                        <div className="flex items-center gap-1 text-caption text-success-dark">
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow className="hover:bg-transparent">
                          <TableHeaderCell>Товар</TableHeaderCell>
                          <TableHeaderCell className="text-center">Текущий</TableHeaderCell>
                          <TableHeaderCell className="text-center">Мин</TableHeaderCell>
                          <TableHeaderCell className="text-center">Рекомендуемо</TableHeaderCell>
                          <TableHeaderCell className="text-right">Цена</TableHeaderCell>
                          <TableHeaderCell className="text-right">Сумма</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {supplierData.products.map((product: any) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="text-body-medium text-brand-black">
                                {product.internalName || product.name}
                              </div>
                              <div className="text-caption text-text-muted">{product.article}</div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              <span
                                className={cn(
                                  'font-semibold',
                                  product.currentStock === 0 ? 'text-danger' : 'text-brand-black'
                                )}
                              >
                                {product.currentStock}
                              </span>
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-text-muted">
                              {product.minStock}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              <span className="font-semibold text-brand-black">
                                {product.suggestedQuantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-text-muted">
                              {product.costPrice
                                ? `${Math.round(product.costPrice).toLocaleString('ru-RU')} ₸`
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-semibold text-brand-black">
                              {product.estimatedCost
                                ? `${Math.round(product.estimatedCost).toLocaleString('ru-RU')} ₸`
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </Layout>
  );
};
