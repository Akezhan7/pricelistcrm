import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Order, UpdatePriceDto } from '../types';
import { updateProductPricesFromOrder } from '../services/priceHistoryApi';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatPriceKZT } from '../utils/format';

type UpdatePricesFromOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order | null;
};

type PriceUpdate = {
  productId: number;
  productName: string;
  productArticle: string;
  currentCostPrice: number;
  currentSellingPrice: number;
  priceAtPurchase: number;
  newCostPrice: string;
  newSellingPrice: string;
  reason: string;
  updateCostPrice: boolean;
  updateSellingPrice: boolean;
};

export const UpdatePricesFromOrderModal: React.FC<UpdatePricesFromOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  order,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([]);
  const [globalReason, setGlobalReason] = useState('');

  useEffect(() => {
    if (isOpen && order && order.items) {
      const updates: PriceUpdate[] = order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.name || 'Товар',
        productArticle: item.product?.article || '',
        currentCostPrice: Number(item.product?.costPrice || 0),
        currentSellingPrice: Number(item.product?.sellingPrice || 0),
        priceAtPurchase: Number(item.priceAtPurchase),
        newCostPrice: '',
        newSellingPrice: '',
        reason: '',
        updateCostPrice: false,
        updateSellingPrice: false,
      }));
      setPriceUpdates(updates);
      setGlobalReason(`Обновление через заявку ${order.orderNumber}`);
    }
  }, [isOpen, order]);

  const handleUpdateField = (
    index: number,
    field: keyof PriceUpdate,
    value: string | boolean
  ) => {
    const updated = [...priceUpdates];
    updated[index] = { ...updated[index], [field]: value };
    setPriceUpdates(updated);
  };

  const handleApplyPriceFromOrder = (index: number) => {
    const updated = [...priceUpdates];
    updated[index] = {
      ...updated[index],
      newCostPrice: updated[index].priceAtPurchase.toString(),
      updateCostPrice: true,
    };
    setPriceUpdates(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const selectedUpdates = priceUpdates.filter(
      (item) => item.updateCostPrice || item.updateSellingPrice
    );

    if (selectedUpdates.length === 0) {
      setError('Выберите хотя бы один товар для обновления цен');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData: UpdatePriceDto[] = selectedUpdates.map((item) => {
        const dto: UpdatePriceDto = {
          productId: item.productId,
          reason: item.reason || globalReason,
        };

        if (item.updateCostPrice && item.newCostPrice) {
          dto.newCostPrice = parseFloat(item.newCostPrice);
        }

        if (item.updateSellingPrice && item.newSellingPrice) {
          dto.newSellingPrice = parseFloat(item.newSellingPrice);
        }

        return dto;
      });

      await updateProductPricesFromOrder(order.id, { priceUpdates: updateData });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка обновления цен');
    } finally {
      setLoading(false);
    }
  };

  const getPriceDiff = (current: number, newPrice: string) => {
    if (!newPrice) return null;
    const diff = parseFloat(newPrice) - current;
    const percent = current > 0 ? (diff / current) * 100 : 0;
    return { diff, percent };
  };

  const selectedCount = priceUpdates.filter(
    (p) => p.updateCostPrice || p.updateSellingPrice
  ).length;

  if (!isOpen || !order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Обновить базовые цены товаров"
      size="xl"
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={loading ? 'Обновление...' : 'Обновить цены'}
          submitLoading={loading}
          submitDisabled={loading}
          onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          submitType="button"
        />
      }
    >
      <p className="text-caption text-text-muted mb-4">
        Заявка: {order.orderNumber}
        {selectedCount > 0 && (
          <span className="ml-2">
            · Выбрано: {selectedCount}
          </span>
        )}
      </p>

      <form id="update-prices-form" onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <Card variant="inset">
          <CardBody>
            <Input
              label="Причина обновления (применится ко всем товарам)"
              value={globalReason}
              onChange={(e) => setGlobalReason(e.target.value)}
              placeholder="Например: Новый прайс от поставщика"
            />
          </CardBody>
        </Card>

        <div className="space-y-3">
          {priceUpdates.map((item, index) => {
            const costDiff = getPriceDiff(item.currentCostPrice, item.newCostPrice);
            const sellingDiff = getPriceDiff(
              item.currentSellingPrice,
              item.newSellingPrice
            );

            return (
              <Card key={item.productId} variant="elevated">
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-card-title text-brand-black">{item.productName}</h3>
                      <p className="text-caption text-text-muted mt-0.5">
                        Артикул: {item.productArticle}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleApplyPriceFromOrder(index)}
                      className="flex-shrink-0"
                    >
                      Применить цену из заявки
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-label uppercase tracking-wider text-text-muted mb-1">
                        Текущая себестоимость
                      </p>
                      <p className="text-price tabular-nums">{formatPriceKZT(item.currentCostPrice)}</p>
                    </div>
                    <div>
                      <p className="text-label uppercase tracking-wider text-text-muted mb-1">
                        Цена в заявке
                      </p>
                      <p className="text-price tabular-nums text-accent">{formatPriceKZT(item.priceAtPurchase)}</p>
                    </div>
                    <div>
                      <p className="text-label uppercase tracking-wider text-text-muted mb-1">
                        Текущая цена продажи
                      </p>
                      <p className="text-price tabular-nums">{formatPriceKZT(item.currentSellingPrice)}</p>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.updateCostPrice}
                        onChange={(e) =>
                          handleUpdateField(index, 'updateCostPrice', e.target.checked)
                        }
                        className="mt-2.5 h-4 w-4 rounded border-border-subtle text-brand-yellow focus:ring-brand-yellow"
                      />
                      <div className="flex-1 space-y-2">
                        <label className="text-label uppercase tracking-wider text-text-muted">
                          Новая себестоимость
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.newCostPrice}
                            onChange={(e) =>
                              handleUpdateField(index, 'newCostPrice', e.target.value)
                            }
                            disabled={!item.updateCostPrice}
                            placeholder={item.currentCostPrice.toString()}
                            className="flex-1"
                          />
                          {costDiff && (
                            <Badge
                              variant={costDiff.diff >= 0 ? 'danger' : 'success'}
                              className="flex items-center gap-1 flex-shrink-0"
                            >
                              {costDiff.diff >= 0 ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                              {costDiff.diff >= 0 ? '+' : ''}
                              {costDiff.percent.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.updateSellingPrice}
                        onChange={(e) =>
                          handleUpdateField(index, 'updateSellingPrice', e.target.checked)
                        }
                        className="mt-2.5 h-4 w-4 rounded border-border-subtle text-brand-yellow focus:ring-brand-yellow"
                      />
                      <div className="flex-1 space-y-2">
                        <label className="text-label uppercase tracking-wider text-text-muted">
                          Новая цена продажи
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.newSellingPrice}
                            onChange={(e) =>
                              handleUpdateField(index, 'newSellingPrice', e.target.value)
                            }
                            disabled={!item.updateSellingPrice}
                            placeholder={item.currentSellingPrice.toString()}
                            className="flex-1"
                          />
                          {sellingDiff && (
                            <Badge
                              variant={sellingDiff.diff >= 0 ? 'danger' : 'success'}
                              className="flex items-center gap-1 flex-shrink-0"
                            >
                              {sellingDiff.diff >= 0 ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                              {sellingDiff.diff >= 0 ? '+' : ''}
                              {sellingDiff.percent.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </form>
    </Modal>
  );
};
