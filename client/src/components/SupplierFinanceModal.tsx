import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, MessageSquare, Paperclip, FileText, X } from 'lucide-react';
import { createPayment, getPaymentsBySupplier, formatPaymentAmount, formatPaymentDate, getPaymentMethodIcon, getPaymentMethodColor, type CreatePaymentData, type SupplierPaymentData } from '../services/paymentsApi';
import getImageUrl from '../utils/image';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { FormSection } from './ui/FormSection';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Badge } from './ui/Badge';
import { Spinner } from './ui/Spinner';
import { toast } from '../context/ToastContext';
import { cn } from '../utils/cn';

interface SupplierFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  supplierName: string;
  onSuccess?: () => void;
}

export const SupplierFinanceModal: React.FC<SupplierFinanceModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [supplierData, setSupplierData] = useState<SupplierPaymentData | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Форма добавления платежа
  const [paymentForm, setPaymentForm] = useState<CreatePaymentData>({
    supplierId,
    amount: 0,
    paymentMethod: 'Наличные',
    comment: '',
  });
  
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && supplierId) {
      loadSupplierData();
    }
  }, [isOpen, supplierId]);

  const loadSupplierData = async () => {
    setLoading(true);
    try {
      const data = await getPaymentsBySupplier(supplierId);
      setSupplierData(data);
    } catch (error) {
      console.error('Ошибка загрузки данных поставщика:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowAddPayment(false);
    setPaymentForm({
      supplierId,
      amount: 0,
      paymentMethod: 'Наличные',
      comment: '',
    });
    setSelectedOrders([]);
    setReceiptFile(null);
    onClose();
  };

  const handleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const calculateTotalDebt = () => {
    if (!supplierData) return 0;
    
    if (selectedOrders.length === 0) {
      return parseFloat(supplierData.stats.totalDebt);
    }
    
    return supplierData.unpaidOrders
      .filter(order => selectedOrders.includes(order.id))
      .reduce((sum, order) => {
        return sum + (parseFloat(order.totalAmount) - parseFloat(order.paidAmount));
      }, 0);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentForm.amount <= 0) {
      toast.warning('Введите сумму платежа');
      return;
    }

    setSubmitting(true);
    try {
      await createPayment({
        ...paymentForm,
        orderIds: selectedOrders.length > 0 ? selectedOrders : undefined,
        receipt: receiptFile || undefined,
      });

      // Перезагрузить данные
      await loadSupplierData();

      // Сбросить форму
      setShowAddPayment(false);
      setPaymentForm({
        supplierId,
        amount: 0,
        paymentMethod: 'Наличные',
        comment: '',
      });
      setSelectedOrders([]);
      setReceiptFile(null);

      onSuccess?.();
    } catch (error) {
      console.error('Ошибка создания платежа:', error);
      toast.error('Ошибка при регистрации платежа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Финансы — ${supplierName}`}
      size="xl"
      footer={<FormFooter onCancel={handleClose} cancelLabel="Закрыть" showSubmit={false} />}
    >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="brand" />
            </div>
          ) : supplierData ? (
            <div className="space-y-6">
              {/* Статистика */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-inset border border-border-subtle rounded-xl p-4">
                  <div className="text-metric font-tabular text-danger">
                    {formatPaymentAmount(supplierData.stats.totalDebt)}
                  </div>
                  <div className="text-caption text-text-muted mt-1">Общая задолженность</div>
                </div>
                <div className="bg-surface-inset border border-border-subtle rounded-xl p-4">
                  <div className="text-metric font-tabular text-success">
                    {formatPaymentAmount(supplierData.stats.totalPaid)}
                  </div>
                  <div className="text-caption text-text-muted mt-1">Всего оплачено</div>
                </div>
                <div className="bg-surface-inset border border-border-subtle rounded-xl p-4">
                  <div className="text-metric font-tabular text-brand-black">
                    {supplierData.stats.unpaidOrdersCount}
                  </div>
                  <div className="text-caption text-text-muted mt-1">Неоплаченных заявок</div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3">
                <h3 className="text-section-title text-brand-black">Неоплаченные заявки</h3>
                <Button type="button" onClick={() => setShowAddPayment(true)} leftIcon={Plus}>
                  Зарегистрировать платеж
                </Button>
              </div>

              {showAddPayment && (
                <FormSection title="Новый платеж">
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Сумма платежа"
                        type="number"
                        step="0.01"
                        min={0}
                        value={paymentForm.amount || ''}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            amount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="Введите сумму"
                        required
                        helperText={`Доступно к оплате: ${formatPaymentAmount(calculateTotalDebt())}`}
                      />
                      <Select
                        label="Способ оплаты"
                        value={paymentForm.paymentMethod}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            paymentMethod: e.target.value as CreatePaymentData['paymentMethod'],
                          }))
                        }
                      >
                        <option value="Наличные">Наличные</option>
                        <option value="Перевод">Перевод</option>
                        <option value="Карта">Карта</option>
                        <option value="Другое">Другое</option>
                      </Select>
                    </div>

                    <Textarea
                      label="Комментарий"
                      value={paymentForm.comment}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, comment: e.target.value }))
                      }
                      rows={3}
                      placeholder="Дополнительная информация о платеже"
                      className="resize-none"
                    />

                    <div>
                      <p className="text-caption font-medium text-brand-black mb-2">Чек (необязательно)</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border-subtle rounded-xl bg-surface-base hover:border-brand-yellow text-sm transition-colors">
                          <Paperclip className="h-4 w-4 text-text-muted" />
                          <span className="text-brand-black">
                            {receiptFile ? 'Заменить файл' : 'Прикрепить чек'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        {receiptFile && (
                          <div className="flex items-center gap-2 text-sm text-brand-black">
                            <FileText className="h-4 w-4 text-brand-yellow" />
                            <span className="truncate max-w-[200px]">{receiptFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setReceiptFile(null)}
                              className="text-danger hover:text-danger-dark"
                              title="Удалить файл"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-1">Изображение или PDF, до 5 МБ</p>
                    </div>

                    <FormFooter
                      onCancel={() => setShowAddPayment(false)}
                      submitLabel={submitting ? 'Обработка...' : 'Зарегистрировать'}
                      submitLoading={submitting}
                      submitDisabled={submitting}
                      showBorder={false}
                      className="px-0 py-0"
                    />
                  </form>
                </FormSection>
              )}

              {/* Список неоплаченных заявок */}
              {supplierData.unpaidOrders.length > 0 ? (
                <div className="space-y-3">
                  {supplierData.unpaidOrders.map((order) => {
                    const remaining = parseFloat(order.totalAmount) - parseFloat(order.paidAmount);
                    const isSelected = selectedOrders.includes(order.id);
                    
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'border rounded-xl p-4 transition-all',
                          showAddPayment && 'cursor-pointer',
                          isSelected
                            ? 'border-brand-yellow bg-surface-accent'
                            : 'border-border-subtle hover:border-brand-yellow/40'
                        )}
                        onClick={() => showAddPayment && handleOrderSelection(order.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {showAddPayment && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleOrderSelection(order.id)}
                                className="rounded border-border-subtle text-brand-yellow focus:ring-brand-yellow"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-brand-black">{order.orderNumber}</div>
                              <div className="text-sm text-text-muted">
                                {formatPaymentDate(order.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-medium text-brand-black font-tabular">
                              {formatPaymentAmount(remaining)}
                            </div>
                            <div className="text-sm text-text-muted font-tabular">
                              из {formatPaymentAmount(order.totalAmount)}
                            </div>
                            <Badge
                              variant={
                                order.paymentStatus === 'Не оплачено' ? 'danger' : 'warning'
                              }
                              className="mt-1"
                            >
                              {order.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-text-muted/40" />
                  <p>Все заявки оплачены</p>
                </div>
              )}

              {/* История платежей */}
              <div className="border-t pt-6">
                <h3 className="text-section-title text-brand-black mb-4">История платежей</h3>
                {supplierData.payments.length > 0 ? (
                  <div className="space-y-3">
                    {supplierData.payments.slice(0, 10).map((payment) => (
                      <div key={payment.id} className="border border-border-subtle rounded-xl p-4 bg-surface-base">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {getPaymentMethodIcon(payment.paymentMethod)}
                            </div>
                            <div>
                              <div className="font-medium text-brand-black font-tabular">
                                {formatPaymentAmount(payment.amount)}
                              </div>
                              <div className="text-sm text-text-muted">
                                {formatPaymentDate(payment.paymentDate)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded-full inline-block ${getPaymentMethodColor(payment.paymentMethod)}`}>
                              {payment.paymentMethod}
                            </div>
                            {payment.creator && (
                              <div className="text-xs text-text-muted mt-1">
                                {payment.creator.name}
                              </div>
                            )}
                          </div>
                        </div>
                        {payment.comment && (
                          <div className="mt-2 text-sm text-text-muted bg-surface-inset p-2 rounded-lg">
                            {payment.comment}
                          </div>
                        )}
                        {payment.receiptUrl && (
                          <div className="mt-2">
                            <a
                              href={getImageUrl(payment.receiptUrl) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-brand-yellow/30 bg-surface-accent px-2 py-1 text-sm text-brand-black hover:bg-brand-yellow/10"
                            >
                              <FileText className="h-4 w-4" />
                              Открыть чек
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                    {supplierData.payments.length > 10 && (
                      <div className="text-center">
                        <Button variant="ghost" size="sm" className="text-accent-blue">
                          Показать еще ({supplierData.payments.length - 10})
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-text-muted/40" />
                    <p>Платежи пока не регистрировались</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
    </Modal>
  );
};

export default SupplierFinanceModal;