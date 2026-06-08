import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import warehouseApi from '../services/warehouseApi';
import { Order } from '../types';
import { Package, CheckCircle, AlertTriangle, Edit3, ArrowLeft, ChevronRight } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
} from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';

interface ReceiptItem {
  productId: number;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  notes: string;
}

export const WarehouseReceipt: React.FC = () => {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
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
    limit: 20,
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
        limit: pagination.limit,
      });
      setPendingOrders(data.orders);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
      toast.error('Не удалось загрузить заявки на приёмку');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    setSelectedOrder(null);
  };

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    const items: ReceiptItem[] =
      order.items?.map((item) => ({
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
    setReceiptItems((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, receivedQuantity: quantity } : item
      )
    );
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setReceiptItems((items) =>
      items.map((item) => (item.productId === productId ? { ...item, notes } : item))
    );
  };

  const handleAcceptFull = async () => {
    if (!selectedOrder) return;

    const hasDiscrepancies = receiptItems.some(
      (item) => item.receivedQuantity !== item.expectedQuantity
    );

    if (hasDiscrepancies) {
      const ok = await confirm({
        title: 'Расхождения при приёмке',
        message: 'Обнаружены расхождения! Принять полностью всё равно?',
        confirmLabel: 'Принять',
        variant: 'default',
      });
      if (!ok) return;
    }

    await submitReceipt('full');
  };

  const handleAcceptPartial = async () => {
    if (!selectedOrder) return;

    const hasDiscrepancies = receiptItems.some(
      (item) => item.receivedQuantity !== item.expectedQuantity
    );

    if (!hasDiscrepancies) {
      toast.warning('Расхождений нет. Используйте «Принять полностью».');
      return;
    }

    await submitReceipt('partial');
  };

  const submitReceipt = async (type: 'full' | 'partial') => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);

      const items = receiptItems.map((item) => ({
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

      toast.success('Приёмка завершена успешно');
      setSelectedOrder(null);
      setReceiptItems([]);
      setGeneralNotes('');
      loadPendingOrders();
    } catch (error) {
      console.error('Ошибка приёмки:', error);
      toast.error('Не удалось провести приёмку');
    } finally {
      setSubmitting(false);
    }
  };

  const getDiscrepancyBadge = (item: ReceiptItem) => {
    const diff = item.receivedQuantity - item.expectedQuantity;

    if (diff === 0) {
      return (
        <Badge variant="success">
          <span className="inline-flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Совпадает
          </span>
        </Badge>
      );
    }

    return (
      <Badge variant="danger">
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {diff > 0 ? `+${diff}` : diff} шт
        </span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" color="brand" useLucide />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-24 md:pb-6">
        <PageHeader
          title="Приёмка товара"
          description="Сверка и приём товара от поставщиков"
          icon={Package}
        />

        {!selectedOrder ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-yellow" aria-hidden />
                Заявки, ожидающие приёмки
              </CardTitle>
            </CardHeader>

            {pendingOrders.length === 0 ? (
              <EmptyState icon={Package} title="Нет заявок на приёмку" className="py-12" />
            ) : (
              <div className="divide-y divide-border-subtle">
                {pendingOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => selectOrder(order)}
                    className={cn(
                      'w-full text-left p-4 sm:p-5 transition-colors duration-fast',
                      'hover:bg-surface-inset/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-yellow'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-card-title text-brand-black">
                            Заявка #{order.orderNumber}
                          </h3>
                          <Badge variant="info">{order.status}</Badge>
                        </div>

                        <div className="space-y-1 text-caption text-text-muted">
                          <p>
                            <span className="text-body-medium text-brand-black">Поставщик:</span>{' '}
                            {order.supplier?.name || 'Не указан'}
                          </p>
                          <p>
                            <span className="text-body-medium text-brand-black">Товаров:</span>{' '}
                            {order.items?.length || 0} позиций
                          </p>
                          <p>
                            <span className="text-body-medium text-brand-black">Сумма:</span>{' '}
                            {formatPriceKZT(order.totalAmount ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="primary"
                          className="flex-1 sm:flex-none min-h-11"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectOrder(order);
                          }}
                        >
                          Принять
                        </Button>
                        <ChevronRight className="h-5 w-5 text-text-muted hidden sm:block" aria-hidden />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {pagination.pages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <h2 className="text-section-title text-brand-black mb-2">
                      Заявка #{selectedOrder.orderNumber}
                    </h2>
                    <div className="space-y-1 text-caption text-text-muted">
                      <p>
                        <span className="text-body-medium text-brand-black">Поставщик:</span>{' '}
                        {selectedOrder.supplier?.name}
                      </p>
                      <p>
                        <span className="text-body-medium text-brand-black">Статус:</span>{' '}
                        {selectedOrder.status}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    leftIcon={ArrowLeft}
                    onClick={() => setSelectedOrder(null)}
                    className="w-full sm:w-auto min-h-11"
                  >
                    Назад к списку
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Mobile: card-first receipt items */}
            <div className="md:hidden space-y-3">
              <p className="text-overline text-text-muted">Сверка товаров</p>
              {receiptItems.map((item) => (
                <Card key={item.productId} variant="inset" className="shadow-none">
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-body-medium text-brand-black">{item.productName}</p>
                      {getDiscrepancyBadge(item)}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-overline text-text-muted mb-1">Ожидается</p>
                        <p className="text-metric tabular-nums text-brand-black">{item.expectedQuantity}</p>
                      </div>
                      <div>
                        <Input
                          label="Получено"
                          type="number"
                          min={0}
                          value={item.receivedQuantity}
                          onChange={(e) => updateReceivedQuantity(item.productId, e.target.value)}
                          className="text-center tabular-nums"
                        />
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="Комментарий..."
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                    />
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card className="overflow-hidden hidden md:block">
              <CardHeader>
                <CardTitle>Сверка товаров</CardTitle>
              </CardHeader>

              <Table>
                <TableHead sticky>
                  <TableRow className="hover:bg-transparent">
                    <TableHeaderCell>Товар</TableHeaderCell>
                    <TableHeaderCell className="text-center">Ожидается</TableHeaderCell>
                    <TableHeaderCell className="text-center">Получено</TableHeaderCell>
                    <TableHeaderCell className="text-center">Статус</TableHeaderCell>
                    <TableHeaderCell>Комментарий</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receiptItems.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <div className="text-body-medium text-brand-black">{item.productName}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="tabular-nums text-body-medium text-brand-black">
                          {item.expectedQuantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          value={item.receivedQuantity}
                          onChange={(e) =>
                            updateReceivedQuantity(item.productId, e.target.value)
                          }
                          className="w-24 mx-auto text-center tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-center">{getDiscrepancyBadge(item)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[12rem]">
                          <Edit3 className="h-4 w-4 text-text-muted shrink-0" aria-hidden />
                          <Input
                            type="text"
                            placeholder="Комментарий..."
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card>
              <CardBody>
                <Textarea
                  label="Общий комментарий к приёмке"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={3}
                  placeholder="Дополнительные замечания, проблемы, особенности..."
                />
              </CardBody>
            </Card>

            <Alert variant="info" className="hidden md:block">
              <strong>Совет:</strong> Используйте «Принять полностью», если все количества совпадают.
              Если есть расхождения, укажите фактическое количество и используйте «Принять с
              расхождениями».
            </Alert>

            {/* Desktop actions */}
            <Card className="hidden md:block">
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOrder(null)}
                    disabled={submitting}
                  >
                    Отмена
                  </Button>

                  <Button
                    variant="secondary"
                    leftIcon={AlertTriangle}
                    onClick={handleAcceptPartial}
                    loading={submitting}
                    className="border-warning/40 text-warning-dark hover:bg-warning-light"
                  >
                    Принять с расхождениями
                  </Button>

                  <Button
                    variant="primary"
                    leftIcon={CheckCircle}
                    onClick={handleAcceptFull}
                    loading={submitting}
                  >
                    Принять полностью
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Mobile sticky action bar */}
            <div
              className={cn(
                'md:hidden fixed bottom-0 left-0 right-0 z-40',
                'bg-brand-white/95 backdrop-blur-sm border-t border-border-subtle',
                'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
                'flex flex-col gap-2'
              )}
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={CheckCircle}
                onClick={handleAcceptFull}
                loading={submitting}
              >
                Принять полностью
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={AlertTriangle}
                  onClick={handleAcceptPartial}
                  loading={submitting}
                  className="border-warning/40 text-warning-dark"
                >
                  С расхождениями
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedOrder(null)}
                  disabled={submitting}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
