import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  User,
  FileText,
  CreditCard,
  DollarSign,
  Download,
  Send,
  CheckCircle,
  UserPlus,
  ClipboardCheck,
  MoreVertical,
  XCircle,
  HandCoins,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ordersApi from '../services/ordersApi';
import ChangeOrderStatusModal from '../components/ChangeOrderStatusModal';
import PaymentModal from '../components/PaymentModal';
import { UpdatePricesFromOrderModal } from '../components/UpdatePricesFromOrderModal';
import EditOrderModal from '../components/EditOrderModal';
import { generateOrderPDF } from '../utils/pdfGenerator';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';
import type { ButtonVariant } from '../components/ui';
import {
  deliveryStatusColors,
  getOrderStatusColor,
  getPaymentStatusColor,
  orderStatusColors,
} from '../theme/statusColors';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';
import type { Order, OrderSettlementType, OrderStatus, OrderStatusOptions } from '../types';

type HeaderAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: ButtonVariant;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
};

const resolveStatusBadgeClass = (status: string): string => {
  if (status in orderStatusColors) {
    return getOrderStatusColor(status as OrderStatus);
  }
  return deliveryStatusColors[status] ?? getOrderStatusColor('Создана');
};

const settlementTypeLabel: Record<OrderSettlementType, string> = {
  standard: 'Обычная закупка',
  consignment: 'Под реализацию',
};

interface FinanceStatProps {
  label: string;
  value: string;
  valueClassName?: string;
}

const FinanceStat: React.FC<FinanceStatProps> = ({ label, value, valueClassName }) => (
  <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
    <p className="text-caption font-medium text-text-muted">{label}</p>
    <p className={cn('mt-1 text-h2 font-bold tabular-nums tracking-tight', valueClassName ?? 'text-brand-black')}>
      {value}
    </p>
  </div>
);

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const canEditOrders = user?.role === 'admin' || user?.role === 'purchase_manager';
  const canDeleteOrders = user?.role === 'admin';
  const canManagePayments = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 'purchase_manager';
  const canConfirmOrders = user?.role === 'admin' || user?.role === 'purchase_manager';
  const canAssignCollector = user?.role === 'admin' || user?.role === 'purchase_manager' || user?.role === 'warehouse_operator';

  const [order, setOrder] = useState<Order | null>(null);
  const [statusOptions, setStatusOptions] = useState<OrderStatusOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdatePricesModal, setShowUpdatePricesModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [confirmationItems, setConfirmationItems] = useState<{[key: number]: number}>({});
  const [showCollectorAssign, setShowCollectorAssign] = useState(false);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState<number | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, options] = await Promise.all([
        ordersApi.getOrderById(Number(id)),
        ordersApi.getOrderStatusOptions(Number(id)),
      ]);
      setOrder(data);
      setStatusOptions(options);

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

  useEffect(() => {
    if (!showActionsMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  const getStatusIcon = (status: OrderStatus | string) => {
    const icons: Record<string, React.ReactNode> = {
      'Создана': <FileText className="w-4 h-4" />,
      'Отправлена поставщику': <Send className="w-4 h-4" />,
      'Частично подтверждена': <ClipboardCheck className="w-4 h-4" />,
      'Подтверждена': <CheckCircle className="w-4 h-4" />,
      'В сборе': <UserPlus className="w-4 h-4" />,
      'Забрана': <Truck className="w-4 h-4" />,
      'Принята на складе': <Warehouse className="w-4 h-4" />,
      'Закрыта': <Package className="w-4 h-4" />,
      'Отменена': <XCircle className="w-4 h-4" />,
      'В работе': <Package className="w-4 h-4" />,
      'На точке': <MapPin className="w-4 h-4" />,
      'В пути': <Truck className="w-4 h-4" />,
      'На складе': <Warehouse className="w-4 h-4" />,
    };
    return icons[status] || <Package className="w-4 h-4" />;
  };

  const calculatePaymentProgress = () => {
    if (!order) return 0;
    const total = Number(order.totalAmount);
    const paid = Number(order.paidAmount);
    return total > 0 ? (paid / total) * 100 : 0;
  };

  const handleDeleteConfirm = async () => {
    if (!order) return;

    try {
      setDeleteLoading(true);
      await ordersApi.deleteOrder(order.id);
      toast.success('Заявка успешно удалена');
      navigate('/orders');
    } catch (err: any) {
      toast.error(`Ошибка удаления: ${err.message}`);
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePaymentSubmit = async (amount: number, comment?: string) => {
    if (!order) return;

    try {
      setPaymentLoading(true);
      const response = await ordersApi.updateOrderPayment(order.id, amount, comment);

      await loadOrder();

      const statusNote = response.payment.statusChanged
        ? ` Статус изменен на «${response.payment.newStatus}».`
        : '';
      toast.success(`Оплата успешно зарегистрирована!${statusNote}`);
      setShowPaymentModal(false);
    } catch (error: any) {
      console.error('Ошибка регистрации оплаты:', error);
      toast.error(error.message || 'Ошибка при регистрации оплаты');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSettlementChange = async (settlementType: OrderSettlementType) => {
    if (!order) return;

    try {
      setSettlementLoading(true);
      await ordersApi.changeSettlementType(order.id, settlementType);
      await loadOrder();
      toast.success(
        settlementType === 'consignment'
          ? 'Заявка отмечена как «Под реализацию»'
          : 'Для заявки выбрана обычная оплата'
      );
    } catch (err: any) {
      toast.error(err.message || 'Ошибка изменения условия расчёта');
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!order) return;

    try {
      await generateOrderPDF(order);
    } catch (error: any) {
      console.error('Ошибка генерации PDF:', error);
      toast.error('Ошибка при создании PDF документа');
    }
  };

  const handleSendToWhatsApp = async () => {
    if (!order || !order.supplier?.whatsapp) {
      toast.warning('У поставщика не указан номер WhatsApp');
      return;
    }

    try {
      setWhatsappLoading(true);
      const response = await ordersApi.sendToWhatsApp(order.id);
      window.open(response.deepLink, '_blank');
    } catch (error: any) {
      console.error('Ошибка генерации WhatsApp сообщения:', error);
      toast.error('Ошибка при создании WhatsApp сообщения');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleConfirmOrder = async (isPartial: boolean = false) => {
    if (!order) return;

    try {
      if (isPartial) {
        const items = Object.entries(confirmationItems).map(([productId, quantity]) => ({
          productId: parseInt(productId),
          confirmedQuantity: quantity,
          isAvailable: true,
        }));

        await ordersApi.partialConfirm(order.id, { items });
        toast.success('Заявка частично подтверждена поставщиком');
      } else {
        await ordersApi.confirmOrder(order.id);
        toast.success('Заявка полностью подтверждена поставщиком');
      }

      setShowConfirmationForm(false);
      setConfirmationItems({});
      loadOrder();
    } catch (error: any) {
      console.error('Ошибка подтверждения заявки:', error);
      toast.error('Ошибка при подтверждении заявки');
    }
  };

  const handleAssignCollector = async () => {
    if (!order || !selectedCollectorId) {
      toast.warning('Выберите сборщика');
      return;
    }

    try {
      await ordersApi.assignCollector(order.id, { collectorId: selectedCollectorId });
      toast.success('Сборщик успешно назначен');
      setShowCollectorAssign(false);
      setSelectedCollectorId(null);
      loadOrder();
    } catch (error: any) {
      console.error('Ошибка назначения сборщика:', error);
      toast.error('Ошибка при назначении сборщика');
    }
  };

  useEffect(() => {
    const loadCollectors = async () => {
      try {
        const usersApi = (await import('../services/usersApi')).default;
        const users = await usersApi.getCollectors();
        setCollectors(users);
      } catch (error) {
        console.error('Ошибка загрузки сборщиков:', error);
        setCollectors([]);
      }
    };

    if (showCollectorAssign) {
      loadCollectors();
    }
  }, [showCollectorAssign]);

  const headerActions = useMemo((): HeaderAction[] => {
    if (!order) return [];

    const actions: HeaderAction[] = [];

    if (canEditOrders && order.status === 'Создана' && order.supplier?.whatsapp) {
      actions.push({
        key: 'whatsapp',
        label: 'WhatsApp',
        icon: Send,
        onClick: handleSendToWhatsApp,
        variant: 'secondary',
        className: 'border-green-600/30 text-green-700 hover:bg-green-50',
        loading: whatsappLoading,
        primary: true,
      });
    }

    if (
      canEditOrders &&
      ['Создана', 'Отправлена поставщику', 'Частично подтверждена', 'Подтверждена'].includes(order.status)
    ) {
      actions.push({
        key: 'edit',
        label: 'Редактировать',
        icon: Edit,
        onClick: () => setShowEditOrderModal(true),
        variant: 'primary',
        primary: true,
      });
    }

    if (canConfirmOrders && order.status === 'Отправлена поставщику') {
      actions.push({
        key: 'confirm',
        label: 'Подтверждено',
        icon: CheckCircle,
        onClick: () => handleConfirmOrder(false),
        variant: 'primary',
        primary: true,
      });
      actions.push({
        key: 'partial',
        label: 'Частично',
        icon: ClipboardCheck,
        onClick: () => setShowConfirmationForm(!showConfirmationForm),
        variant: 'outline',
      });
    }

    if (
      canManagePayments &&
      order.supplierId &&
      order.status !== 'Отменена' &&
      order.paymentStatus !== 'Оплачено'
    ) {
      actions.push({
        key: 'payment',
        label: 'Зарегистрировать оплату',
        icon: CreditCard,
        onClick: () => setShowPaymentModal(true),
        variant: 'primary',
        primary: true,
      });
    }

    if (canDeleteOrders && order.status === 'Создана') {
      actions.push({
        key: 'delete',
        label: 'Удалить',
        icon: Trash2,
        onClick: () => setShowDeleteConfirm(true),
        variant: 'destructive',
      });
    }

    if (canAssignCollector && ['Подтверждена', 'Частично подтверждена'].includes(order.status)) {
      actions.push({
        key: 'collector',
        label: 'Назначить сборщика',
        icon: UserPlus,
        onClick: () => setShowCollectorAssign(!showCollectorAssign),
        variant: 'outline',
      });
    }

    if (statusOptions?.canReceiveAtWarehouse) {
      actions.push({
        key: 'warehouse-receipt',
        label: 'Принять на склад',
        icon: Warehouse,
        onClick: () => navigate(`/warehouse/receipt?orderId=${order.id}`),
        variant: 'primary',
        primary: true,
      });
    }

    if (
      canManagePayments &&
      order.type !== 'return' &&
      ['Принята на складе', 'Закрыта'].includes(order.status)
    ) {
      const nextSettlementType: OrderSettlementType =
        order.settlementType === 'consignment' ? 'standard' : 'consignment';
      actions.push({
        key: 'settlement',
        label: nextSettlementType === 'consignment' ? 'Под реализацию' : 'Обычная оплата',
        icon: HandCoins,
        onClick: () => handleSettlementChange(nextSettlementType),
        variant: 'outline',
        loading: settlementLoading,
        disabled: settlementLoading,
      });
    }

    if (canEditOrders && order.supplierId && statusOptions?.availableStatuses.length) {
      actions.push({
        key: 'status',
        label: 'Изменить статус',
        icon: Package,
        onClick: () => setShowChangeStatusModal(true),
        variant: 'secondary',
      });
    }

    actions.push({
      key: 'pdf',
      label: 'Скачать PDF',
      icon: Download,
      onClick: handleDownloadPDF,
      variant: 'outline',
    });

    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    order,
    canEditOrders,
    canDeleteOrders,
    canManagePayments,
    canConfirmOrders,
    canAssignCollector,
    whatsappLoading,
    showConfirmationForm,
    statusOptions,
    navigate,
    showCollectorAssign,
    settlementLoading,
  ]);

  const primaryActions = headerActions.filter((a) => a.primary);
  const secondaryActions = headerActions.filter((a) => !a.primary);

  const renderActionButton = (action: HeaderAction, fullWidth = false) => (
    <Button
      key={action.key}
      size="sm"
      variant={action.variant ?? 'secondary'}
      leftIcon={action.icon}
      onClick={() => {
        action.onClick();
        setShowActionsMenu(false);
      }}
      loading={action.loading}
      disabled={action.disabled}
      fullWidth={fullWidth}
      className={action.className}
    >
      {action.label}
    </Button>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" color="brand" useLucide />
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <Card className="max-w-md mx-auto mt-12">
          <CardBody className="py-10">
            <ErrorState
              message={error || 'Заявка не найдена'}
              onRetry={() => navigate('/orders')}
              retryLabel="Вернуться к списку"
            />
          </CardBody>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      {order && (
        <ChangeOrderStatusModal
          isOpen={showChangeStatusModal}
          onClose={() => setShowChangeStatusModal(false)}
          onSuccess={() => {
            loadOrder();
            toast.success('Статус успешно изменен!');
          }}
          orderId={order.id}
          currentStatus={order.status}
          orderNumber={order.orderNumber}
          remainingAmount={Math.max(0, Number(order.totalAmount) - Number(order.paidAmount))}
        />
      )}

      {order && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handlePaymentSubmit}
          order={order}
          loading={paymentLoading}
        />
      )}

      {order && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Удалить заявку"
          message={`Вы уверены, что хотите удалить заявку ${order.orderNumber}?`}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="pb-24 md:pb-0 space-y-5 lg:space-y-6">
        {!order.supplierId && (
          <Alert variant="info" title="Поставщик не назначен">
            Это черновик закупки. Назначьте поставщика через редактирование заявки, чтобы
            отправить её, изменить статус или зарегистрировать оплату.
          </Alert>
        )}

        {/* Sticky hero header — Orders V7 pattern */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-1 pb-4 md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle md:border-0 space-y-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={ArrowLeft}
            onClick={() => navigate('/orders')}
            className="px-0 hover:bg-transparent text-text-muted hover:text-brand-black"
          >
            Вернуться к списку заявок
          </Button>

          <Card className="shadow-none hover:shadow-none overflow-hidden">
            <CardBody className="p-0">
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-h1 font-bold tracking-tight text-brand-black sm:text-display">
                        {order.orderNumber}
                      </h1>
                      {order.type === 'return' && (
                        <Badge variant="warning">Возврат</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-body-medium text-brand-black">
                      {order.supplier?.name || 'Без поставщика'}
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 text-caption text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden />
                        {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 flex-shrink-0" aria-hidden />
                        {order.creator?.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Badge
                      statusClass={resolveStatusBadgeClass(order.status)}
                      className="gap-1.5 px-3 py-1.5 text-sm font-medium"
                    >
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                    <Badge statusClass={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                    {order.type !== 'return' && (
                      <Badge variant={order.settlementType === 'consignment' ? 'warning' : 'default'}>
                        {settlementTypeLabel[order.settlementType || 'standard']}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-card border border-border-subtle bg-surface-inset p-4">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-caption font-medium text-text-muted">Сумма заявки</p>
                      <p className="mt-0.5 text-h2 font-bold tabular-nums tracking-tight text-brand-black">
                        {formatPriceKZT(order.totalAmount)}
                      </p>
                      {Number(order.paidAmount) > 0 && (
                        <p className="mt-0.5 text-caption text-text-muted">
                          Оплачено: {formatPriceKZT(order.paidAmount)}
                        </p>
                      )}
                    </div>
                    <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
                      {headerActions.map((action) => renderActionButton(action))}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-5 lg:space-y-6">
          {/* Информация о поставщике */}
          <Card className="shadow-none hover:shadow-none">
            <CardHeader>
              <h2 className="text-section-title font-semibold text-brand-black">Поставщик</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-caption text-text-muted">Название</p>
                <p className="text-body-medium font-medium text-brand-black">
                  {order.supplier?.name || 'Без поставщика'}
                </p>
              </div>
              {order.supplier?.address && (
                <div>
                  <p className="text-caption text-text-muted">Адрес</p>
                  <p className="text-body text-brand-black">{order.supplier.address}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {order.supplier?.phone && (
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={Phone}
                    onClick={() => window.open(`tel:${order.supplier?.phone}`, '_self')}
                  >
                    Позвонить
                  </Button>
                )}
                {order.supplier?.whatsapp && (
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={MessageCircle}
                    className="border-green-600/30 text-green-700 hover:bg-green-50"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${order.supplier?.whatsapp?.replace(/\D/g, '')}`,
                        '_blank'
                      )
                    }
                  >
                    WhatsApp
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Товары в заявке */}
          <Card className="shadow-none hover:shadow-none overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-section-title font-semibold text-brand-black">Товары</h2>
              <Button
                variant="outline"
                size="sm"
                leftIcon={Download}
                onClick={handleDownloadPDF}
                title="Скачать заявку в PDF"
              >
                Скачать PDF
              </Button>
            </CardHeader>
            <CardBody className="p-0 sm:px-0">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Товар</TableHeaderCell>
                    <TableHeaderCell className="text-right">Количество</TableHeaderCell>
                    <TableHeaderCell className="text-right">Цена</TableHeaderCell>
                    <TableHeaderCell className="text-right">Сумма</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-normal min-w-[12rem]">
                        <div className="font-medium text-brand-black">{item.product?.name}</div>
                        <div className="text-sm text-text-muted">{item.product?.article}</div>
                        {item.variation && (
                          <Badge variant="info" className="mt-1.5 gap-1">
                            {item.variation.name}: <span className="font-semibold">{item.variation.value}</span>
                            {item.variation.sku && (
                              <span className="opacity-75">({item.variation.sku})</span>
                            )}
                          </Badge>
                        )}
                        {item.notes && (
                          <div className="text-sm text-text-muted mt-1 italic">{item.notes}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-brand-black">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-brand-black">
                        {formatPriceKZT(item.priceAtPurchase)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-brand-black">
                        {formatPriceKZT(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className="bg-surface-inset border-t-2 border-border-subtle">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-brand-black">
                      Итого:
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-xl text-accent">
                      {formatPriceKZT(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </CardBody>
          </Card>

          {/* Форма частичного подтверждения */}
          {showConfirmationForm && (
            <Alert variant="warning" title="Частичное подтверждение">
              <p className="mb-4">
                Укажите фактическое количество по каждой позиции, которое подтвердил поставщик
              </p>

              <div className="space-y-3">
                {order.items?.map((item) => {
                  if (!item.product) return null;
                  const productId = item.product.id;
                  const confirmedQty = confirmationItems[productId] ?? item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-brand-white rounded-card border border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-brand-black">
                          {item.product.internalName || item.product.name}
                        </div>
                        <div className="text-sm text-text-muted">Запрошено: {item.quantity} шт</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-text-muted whitespace-nowrap">Подтверждено:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={confirmedQty}
                          onChange={(e) =>
                            setConfirmationItems((prev) => ({
                              ...prev,
                              [productId]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-20 px-3 py-2 border border-border rounded-card text-center focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowConfirmationForm(false);
                    setConfirmationItems({});
                  }}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleConfirmOrder(true)}
                  className="bg-warning hover:bg-brand-yellow-dark text-white"
                >
                  Подтвердить частично
                </Button>
              </div>
            </Alert>
          )}

          {/* Форма назначения сборщика */}
          {showCollectorAssign && (
            <Alert variant="info" title="Назначить сборщика">
              <p className="mb-4">
                Выберите сотрудника, который будет забирать товар у поставщика
              </p>

              <div className="space-y-2 mb-4">
                {collectors.map((collector) => (
                  <label
                    key={collector.id}
                    className={cn(
                      'flex items-center p-3 bg-brand-white border border-border rounded-card cursor-pointer transition-colors',
                      selectedCollectorId === collector.id
                        ? 'border-accent bg-info-light/30'
                        : 'hover:bg-surface-inset'
                    )}
                  >
                    <input
                      type="radio"
                      name="collector"
                      value={collector.id}
                      checked={selectedCollectorId === collector.id}
                      onChange={() => setSelectedCollectorId(collector.id)}
                      className="w-4 h-4 text-accent focus:ring-accent"
                    />
                    <span className="ml-3 text-brand-black font-medium">{collector.name}</span>
                  </label>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCollectorAssign(false);
                    setSelectedCollectorId(null);
                  }}
                >
                  Отмена
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleAssignCollector}
                  disabled={!selectedCollectorId}
                >
                  Назначить
                </Button>
              </div>
            </Alert>
          )}

          {/* История статусов */}
          <Card className="shadow-none hover:shadow-none">
            <CardHeader>
              <h2 className="text-section-title font-semibold text-brand-black">История изменений</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {order.statusHistory?.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        index === 0 ? 'bg-brand-yellow/20 text-brand-yellow-dark' : 'bg-surface-inset text-text-muted'
                      )}
                    >
                      {getStatusIcon(history.newStatus)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {history.oldStatus && (
                        <>
                          <Badge statusClass={resolveStatusBadgeClass(history.oldStatus)} className="text-xs">
                            {history.oldStatus}
                          </Badge>
                          <span className="text-text-muted">→</span>
                        </>
                      )}
                      <Badge statusClass={resolveStatusBadgeClass(history.newStatus)} className="text-xs">
                        {history.newStatus}
                      </Badge>
                    </div>
                    <div className="text-sm text-text-muted">
                      {history.changer?.name} • {new Date(history.changedAt).toLocaleString('ru-RU')}
                    </div>
                    {history.comment && (
                      <div className="text-sm text-brand-black mt-2 bg-surface-inset p-3 rounded-xl border border-border-subtle">
                        {history.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {order.settlementHistory?.map((history) => (
                <div key={`settlement-${history.id}`} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-light text-warning-dark">
                      <HandCoins className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {settlementTypeLabel[history.oldSettlementType]}
                      </Badge>
                      <span className="text-text-muted">→</span>
                      <Badge
                        variant={history.newSettlementType === 'consignment' ? 'warning' : 'default'}
                        className="text-xs"
                      >
                        {settlementTypeLabel[history.newSettlementType]}
                      </Badge>
                    </div>
                    <div className="text-sm text-text-muted">
                      {history.changer?.name} • {new Date(history.createdAt).toLocaleString('ru-RU')}
                    </div>
                    {history.comment && (
                      <div className="mt-2 rounded-xl border border-border-subtle bg-surface-inset p-3 text-sm text-brand-black">
                        {history.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* История платежей */}
          {payments.length > 0 && (
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <h2 className="text-section-title font-semibold text-brand-black">История платежей</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-start gap-3 p-4 bg-surface-inset rounded-xl border border-border-subtle"
                  >
                    <div className="p-2 bg-success-light rounded-card flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-lg font-bold text-success">
                          {formatPriceKZT(payment.amount)}
                        </span>
                        {payment.paymentMethod && (
                          <Badge variant="info">{payment.paymentMethod}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-text-muted">
                        {payment.creator?.name} • {new Date(payment.createdAt).toLocaleString('ru-RU')}
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-brand-black mt-2 bg-brand-white p-2 rounded-card border border-border">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Боковая панель */}
        <div className="space-y-5 lg:space-y-6">
          {/* Финансы */}
          <Card className="border-border bg-surface-inset shadow-none hover:shadow-none">
            <CardHeader inset>
              <h2 className="text-section-title font-semibold text-brand-black">Финансы</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {order.type !== 'return' && (
                <div className="rounded-xl border border-border-subtle bg-brand-white p-4">
                  <p className="text-caption font-medium text-text-muted">Условие расчёта</p>
                  <div className="mt-2 flex items-center gap-2">
                    <HandCoins className="h-5 w-5 text-text-muted" />
                    <span className="font-semibold text-brand-black">
                      {settlementTypeLabel[order.settlementType || 'standard']}
                    </span>
                  </div>
                  {order.settlementType === 'consignment' && (
                    <p className="mt-2 text-caption text-text-muted">
                      Неоплаченный остаток учитывается в долге после приёмки. Платёж регистрируется отдельно.
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                <FinanceStat
                  label="Общая сумма"
                  value={formatPriceKZT(order.totalAmount)}
                />
                <FinanceStat
                  label="Оплачено"
                  value={formatPriceKZT(order.paidAmount)}
                  valueClassName="text-success-dark"
                />
                <FinanceStat
                  label="Остаток"
                  value={formatPriceKZT(Number(order.totalAmount) - Number(order.paidAmount))}
                  valueClassName="text-danger-dark"
                />
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
                <p className="text-caption font-medium text-text-muted mb-2">Прогресс оплаты</p>
                <div className="w-full bg-brand-white rounded-full h-2.5 overflow-hidden border border-border-subtle">
                  <div
                    className="bg-success h-full rounded-full transition-all duration-fast"
                    style={{ width: `${calculatePaymentProgress()}%` }}
                  />
                </div>
                <p className="text-caption text-text-muted mt-1.5 text-right tabular-nums">
                  {calculatePaymentProgress().toFixed(0)}%
                </p>
              </div>

              <Badge
                statusClass={getPaymentStatusColor(order.paymentStatus)}
                className="w-full justify-center py-2 text-sm font-medium"
              >
                {order.paymentStatus}
              </Badge>
            </CardBody>
          </Card>

          {/* Доставка */}
          <Card className="shadow-none hover:shadow-none">
            <CardHeader>
              <h2 className="text-section-title font-semibold text-brand-black">Доставка</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Место доставки</p>
                  <p className="font-medium text-brand-black">{order.deliveryLocation}</p>
                </div>
              </div>

              {order.expectedDeliveryDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-text-muted">Ожидаемая дата</p>
                    <p className="font-medium text-brand-black">
                      {new Date(order.expectedDeliveryDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Комментарии */}
          {order.notes && (
            <Card className="shadow-none hover:shadow-none">
              <CardHeader>
                <h2 className="text-section-title font-semibold text-brand-black flex items-center gap-2">
                  <FileText className="w-5 h-5 text-text-muted" />
                  Комментарии
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-brand-black whitespace-pre-wrap leading-relaxed">{order.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile bottom action bar */}
      {headerActions.length > 0 && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-brand-white/95 backdrop-blur-md pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 p-3 max-w-lg mx-auto">
            {(primaryActions.length > 0 ? primaryActions : headerActions).slice(0, 2).map((action) => (
              <Button
                key={action.key}
                size="md"
                variant={action.variant ?? 'primary'}
                leftIcon={action.icon}
                onClick={action.onClick}
                loading={action.loading}
                disabled={action.disabled}
                fullWidth
                className={cn('flex-1 min-h-11', action.className)}
              >
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
            {(secondaryActions.length > 0 || primaryActions.length > 2) && (
              <div className="relative shrink-0" ref={actionsMenuRef}>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={MoreVertical}
                  onClick={() => setShowActionsMenu((prev) => !prev)}
                  aria-expanded={showActionsMenu}
                  aria-haspopup="menu"
                  className="min-h-11 min-w-11 px-3"
                >
                  <span className="sr-only">Ещё действия</span>
                </Button>
                {showActionsMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 bottom-full z-50 mb-2 min-w-[14rem] max-h-[60vh] overflow-y-auto rounded-xl border border-border-subtle bg-brand-white py-1 shadow-card"
                  >
                    {[...primaryActions.slice(2), ...secondaryActions].map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          action.onClick();
                          setShowActionsMenu(false);
                        }}
                        disabled={action.disabled || action.loading}
                        className="flex w-full items-center gap-2 px-4 py-3 min-h-11 text-sm text-brand-black hover:bg-surface-inset disabled:opacity-50 transition-colors duration-200 text-left"
                      >
                        <action.icon className="w-4 h-4 flex-shrink-0 text-text-muted" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {order && (
        <>
          <UpdatePricesFromOrderModal
            isOpen={showUpdatePricesModal}
            onClose={() => setShowUpdatePricesModal(false)}
            onSuccess={() => {
              setShowUpdatePricesModal(false);
              toast.success('Цены товаров успешно обновлены!');
            }}
            order={order}
          />

          <EditOrderModal
            isOpen={showEditOrderModal}
            onClose={() => setShowEditOrderModal(false)}
            onSuccess={() => {
              loadOrder();
              toast.success('Заявка успешно обновлена!');
            }}
            order={order}
          />
        </>
      )}
    </Layout>
  );
};

export default OrderDetails;
