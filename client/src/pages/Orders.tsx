import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Package,
  Truck,
  Warehouse,
  RefreshCw,
  CreditCard,
  Send,
  CheckCircle,
  AlertTriangle,
  Archive,
  Undo2,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import ordersApi from '../services/ordersApi';
import PaymentModal from '../components/PaymentModal';
import { useOrderDraft } from '../context/OrderDraftContext';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';
import { getOrderStatusColor, getPaymentStatusColor } from '../theme/statusColors';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';
import { toast } from '../context/ToastContext';
import type { Order, OrderFilters, OrderStats, OrderStatus, OrderType, PaymentStatus } from '../types';

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
      'w-full min-w-[8.5rem] snap-start shrink-0 md:min-w-0 rounded-card border bg-brand-white p-4 text-left transition-colors duration-200',
      'hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2',
      active
        ? 'border-brand-yellow/40 border-l-[3px] border-l-brand-yellow bg-brand-yellow/10'
        : 'border-border hover:border-gray-300'
    )}
  >
    <p className="text-caption font-medium text-text-muted">{label}</p>
    <p className="mt-1 text-h2 font-bold tabular-nums tracking-tight text-brand-black">{value}</p>
  </button>
);

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

const FilterChip: React.FC<FilterChipProps> = ({ active, onClick, children, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3.5 py-2 text-caption font-medium transition-colors duration-200',
      active
        ? 'border-brand-yellow/40 bg-brand-yellow/10 text-brand-black'
        : 'border-border bg-brand-white text-text-muted hover:bg-surface-muted hover:text-brand-black',
      className
    )}
  >
    {children}
  </button>
);

const STATUS_STATS: { status: OrderStatus; label: string; key: keyof OrderStats }[] = [
  { status: 'Создана', label: 'Созданы', key: 'created' },
  { status: 'Отправлена поставщику', label: 'Отправлены', key: 'sentToSupplier' },
  { status: 'Подтверждена', label: 'Подтверждены', key: 'confirmed' },
  { status: 'В сборе', label: 'В сборе', key: 'inCollection' },
  { status: 'Забрана', label: 'Забраны', key: 'collected' },
  { status: 'Доставка', label: 'Доставка', key: 'delivery' },
  { status: 'Принята на складе', label: 'Приняты', key: 'received' },
  { status: 'Закрыта', label: 'Закрыты', key: 'closed' },
];

const PAYMENT_FILTERS: { value?: PaymentStatus; label: string }[] = [
  { value: undefined, label: 'Все' },
  { value: 'Не оплачено', label: 'Не оплачено' },
  { value: 'Частично оплачено', label: 'Частично' },
  { value: 'Оплачено', label: 'Оплачено' },
];

const TYPE_FILTERS: { value?: OrderType; label: string; icon?: React.ReactNode }[] = [
  { value: undefined, label: 'Все типы' },
  { value: 'purchase', label: 'Заявки', icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'return', label: 'Возвраты', icon: <Undo2 className="h-3.5 w-3.5" /> },
];

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useOrderDraft();

  const canCreateOrders = user?.role === 'admin' || user?.role === 'purchase_manager';
  const canManagePayments = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 'purchase_manager';

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 20,
    status: undefined,
    paymentStatus: undefined,
    search: '',
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20,
  });

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadOrders();
  }, [filters]);

  const handleStatusFilter = (status?: OrderStatus) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const handlePaymentStatusFilter = (paymentStatus?: PaymentStatus) => {
    setFilters((prev) => ({ ...prev, paymentStatus, page: 1 }));
  };

  const handleTypeFilter = (type?: OrderType) => {
    setFilters((prev) => ({ ...prev, type, page: 1 }));
  };

  const openCreateModal = (type: OrderType) => {
    openModal(type, {
      origin: 'modal',
      returnPath: '/orders',
      onSuccess: () => {
        loadOrders();
        toast.success(type === 'return' ? 'Возврат успешно оформлен!' : 'Заявка успешно создана!');
      },
    });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadOrders();
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handlePaymentClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (amount: number, comment?: string) => {
    if (!selectedOrder) return;

    try {
      setPaymentLoading(true);
      const response = await ordersApi.updateOrderPayment(selectedOrder.id, amount, comment);

      setOrders((prev) =>
        prev.map((order) => (order.id === selectedOrder.id ? response.order : order))
      );

      loadOrders();

      const statusNote = response.payment.statusChanged
        ? ` Статус изменен на «${response.payment.newStatus}».`
        : '';
      toast.success(`Оплата успешно зарегистрирована!${statusNote}`);
    } catch (error: any) {
      console.error('Ошибка регистрации оплаты:', error);
      toast.error(error.message || 'Ошибка при регистрации оплаты');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons: Record<OrderStatus, React.ReactElement> = {
      'Создана': <FileText className="h-3.5 w-3.5" />,
      'Отправлена поставщику': <Send className="h-3.5 w-3.5" />,
      'Частично подтверждена': <AlertTriangle className="h-3.5 w-3.5" />,
      'Подтверждена': <CheckCircle className="h-3.5 w-3.5" />,
      'Доставка': <Truck className="h-3.5 w-3.5" />,
      'В сборе': <Package className="h-3.5 w-3.5" />,
      'Забрана': <Truck className="h-3.5 w-3.5" />,
      'Принята на складе': <Warehouse className="h-3.5 w-3.5" />,
      'Закрыта': <Archive className="h-3.5 w-3.5" />,
    };
    return icons[status];
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.paymentStatus || filters.type || filters.search
  );

  const formatOrderDate = (date: string) =>
    new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <Layout>
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

      <div className="space-y-6">
        {/* Sticky header + filters (mobile) */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-1 pb-4 md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle md:border-0 space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-h1 font-bold tracking-tight text-brand-black sm:text-display">
                Заявки
              </h1>
              <p className="mt-1 text-body text-text-muted hidden sm:block">
                Управление заявками на поставку товаров
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <IconButton
                icon={RefreshCw}
                title="Обновить список"
                variant="default"
                size="md"
                onClick={loadOrders}
              />
              {canCreateOrders && (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={Undo2}
                    onClick={() => openCreateModal('return')}
                  >
                    Возврат
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={Plus}
                    onClick={() => openCreateModal('purchase')}
                  >
                    Новая заявка
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card className="shadow-none hover:shadow-none md:hidden">
            <CardBody className="space-y-3 p-4">
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                    aria-hidden
                  />
                  <Input
                    type="text"
                    placeholder="Поиск по номеру заявки..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="bg-surface-inset pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" size="md" className="flex-1">
                    Искать
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => setFilters({ page: 1, limit: 20 })}
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
              </form>

              <Button
                type="button"
                variant="secondary"
                size="md"
                leftIcon={SlidersHorizontal}
                onClick={() => setShowMobileFilters((prev) => !prev)}
                fullWidth
              >
                {showMobileFilters ? 'Скрыть фильтры' : hasActiveFilters ? 'Фильтры применены' : 'Фильтры'}
              </Button>

              <div className={cn('space-y-3', !showMobileFilters && 'hidden')}>
                <div>
                  <p className="mb-2 text-label font-medium text-text-muted">Статус оплаты</p>
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-0.5 -mx-1 px-1">
                    {PAYMENT_FILTERS.map(({ value, label }) => (
                      <FilterChip
                        key={label}
                        active={filters.paymentStatus === value}
                        onClick={() => handlePaymentStatusFilter(value)}
                        className="snap-start shrink-0"
                      >
                        {label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-label font-medium text-text-muted">Тип документа</p>
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-0.5 -mx-1 px-1">
                    {TYPE_FILTERS.map(({ value, label, icon }) => (
                      <FilterChip
                        key={label}
                        active={filters.type === value}
                        onClick={() => handleTypeFilter(value)}
                        className="snap-start shrink-0"
                      >
                        {icon}
                        {label}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              </div>

              {stats && showMobileFilters && (
                <div>
                  <p className="mb-2 text-label font-medium text-text-muted">Статус заявки</p>
                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-0.5 -mx-1 px-1">
                    {STATUS_STATS.map(({ status, label, key }) => (
                      <StatCard
                        key={status}
                        label={label}
                        value={Number(stats[key] ?? 0)}
                        active={filters.status === status}
                        onClick={() => handleStatusFilter(status)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Status stat cards (desktop) */}
        {stats && (
          <div className="hidden md:grid md:grid-cols-4 md:gap-4 lg:grid-cols-8">
            {STATUS_STATS.map(({ status, label, key }) => (
              <StatCard
                key={status}
                label={label}
                value={Number(stats[key] ?? 0)}
                active={filters.status === status}
                onClick={() => handleStatusFilter(status)}
              />
            ))}
          </div>
        )}

        {/* Financial summary */}
        {stats && (
          <Card className="border-border bg-surface-inset shadow-none hover:shadow-none">
            <CardBody className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <p className="text-caption font-medium text-text-muted">Общая сумма</p>
                    <p className="mt-0.5 text-h3 font-semibold tabular-nums text-brand-black">
                      {formatPriceKZT(stats.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption font-medium text-text-muted">Оплачено</p>
                    <p className="mt-0.5 text-h3 font-semibold tabular-nums text-brand-black">
                      {formatPriceKZT(stats.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption font-medium text-text-muted">Задолженность</p>
                    <p
                      className={cn(
                        'mt-0.5 text-h3 font-semibold tabular-nums',
                        parseFloat(stats.totalDebt) > 0 ? 'text-danger' : 'text-brand-black'
                      )}
                    >
                      {formatPriceKZT(stats.totalDebt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Ожидают: {stats.pending || 0}</Badge>
                  <Badge variant="outline">В работе: {stats.inProgress || 0}</Badge>
                  <Badge variant="outline">Завершены: {stats.completed || 0}</Badge>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Search & filters (desktop) */}
        <Card className="hidden md:block shadow-none hover:shadow-none">
          <CardBody className="space-y-4 p-4 sm:p-5">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden
                />
                <Input
                  type="text"
                  placeholder="Поиск по номеру заявки..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="bg-surface-inset pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="md" className="flex-1 sm:flex-none">
                  Искать
                </Button>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setFilters({ page: 1, limit: 20 })}
                  >
                    Сбросить
                  </Button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              <div>
                <p className="mb-2 text-label font-medium text-text-muted">Статус оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_FILTERS.map(({ value, label }) => (
                    <FilterChip
                      key={label}
                      active={filters.paymentStatus === value}
                      onClick={() => handlePaymentStatusFilter(value)}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-label font-medium text-text-muted">Тип документа</p>
                <div className="flex flex-wrap gap-2">
                  {TYPE_FILTERS.map(({ value, label, icon }) => (
                    <FilterChip
                      key={label}
                      active={filters.type === value}
                      onClick={() => handleTypeFilter(value)}
                    >
                      {icon}
                      {label}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Orders list */}
        <Card className="overflow-hidden shadow-none hover:shadow-none">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" color="brand" useLucide />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={loadOrders} retryLabel="Попробовать снова" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Заявки не найдены"
              description={
                hasActiveFilters
                  ? 'Попробуйте изменить фильтры или сбросить поиск'
                  : 'Создайте первую заявку на поставку'
              }
              action={
                canCreateOrders && !hasActiveFilters ? (
                  <Button variant="primary" leftIcon={Plus} onClick={() => openCreateModal('purchase')}>
                    Новая заявка
                  </Button>
                ) : hasActiveFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => setFilters({ page: 1, limit: 20 })}
                  >
                    Сбросить фильтры
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-card border border-border bg-brand-white transition-colors duration-150 active:scale-[0.99] hover:border-gray-300"
                    onClick={() => navigate(`/orders/${order.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/orders/${order.id}`);
                      }
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-h3 font-semibold tracking-tight text-brand-black">
                              {order.orderNumber}
                            </span>
                            {order.type === 'return' && (
                              <Badge variant="warning">
                                <span className="inline-flex items-center gap-1">
                                  <Undo2 className="h-3 w-3" />
                                  Возврат
                                </span>
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-body-medium text-brand-black">
                            {order.supplier?.name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-caption text-text-muted">
                          <span>{formatOrderDate(order.createdAt)}</span>
                          <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden />
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border-subtle pt-4">
                        <p className="text-h3 font-bold tabular-nums text-brand-black">
                          {formatPriceKZT(order.totalAmount)}
                        </p>
                        {Number(order.paidAmount) > 0 && (
                          <p className="mt-0.5 text-caption text-text-muted">
                            Оплачено: {formatPriceKZT(order.paidAmount)}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge statusClass={getOrderStatusColor(order.status, 'compact')}>
                          <span className="inline-flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.status}
                          </span>
                        </Badge>
                        <Badge statusClass={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </div>

                      {canManagePayments && order.paymentStatus !== 'Оплачено' && (
                        <Button
                          variant="secondary"
                          size="md"
                          fullWidth
                          leftIcon={CreditCard}
                          className="mt-4"
                          onClick={(e) => handlePaymentClick(e, order)}
                        >
                          Оплатить
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table scrollable={false}>
                  <TableHead sticky>
                    <TableRow className="hover:bg-transparent">
                      <TableHeaderCell>Номер</TableHeaderCell>
                      <TableHeaderCell>Поставщик</TableHeaderCell>
                      <TableHeaderCell>Дата</TableHeaderCell>
                      <TableHeaderCell className="text-right">Сумма</TableHeaderCell>
                      <TableHeaderCell>Статус</TableHeaderCell>
                      <TableHeaderCell>Оплата</TableHeaderCell>
                      <TableHeaderCell className="text-right">Действия</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="cursor-pointer min-h-[56px]"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-body-medium font-semibold text-brand-black">
                              {order.orderNumber}
                            </span>
                            {order.type === 'return' && (
                              <Badge variant="warning">
                                <span className="inline-flex items-center gap-1">
                                  <Undo2 className="h-3 w-3" />
                                  Возврат
                                </span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="text-body-medium text-brand-black">{order.supplier?.name}</div>
                          {order.supplier?.phone && (
                            <div className="text-caption text-text-muted">{order.supplier.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-body text-brand-black">
                            {formatOrderDate(order.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-body-medium font-semibold tabular-nums text-brand-black">
                            {formatPriceKZT(order.totalAmount)}
                          </div>
                          {Number(order.paidAmount) > 0 && (
                            <div className="text-caption tabular-nums text-text-muted">
                              оплачено: {formatPriceKZT(order.paidAmount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge statusClass={getOrderStatusColor(order.status, 'compact')}>
                            <span className="inline-flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge statusClass={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManagePayments && order.paymentStatus !== 'Оплачено' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={CreditCard}
                              onClick={(e) => handlePaymentClick(e, order)}
                            >
                              Оплатить
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Orders;
