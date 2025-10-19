import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Order, UpdatePriceDto } from '../types';
import { updateProductPricesFromOrder } from '../services/priceHistoryApi';

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
      // Инициализация списка товаров для обновления
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

    // Фильтруем только те товары, где отмечено обновление
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const getPriceDiff = (current: number, newPrice: string) => {
    if (!newPrice) return null;
    const diff = parseFloat(newPrice) - current;
    const percent = current > 0 ? (diff / current) * 100 : 0;
    return { diff, percent };
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Обновить базовые цены товаров
            </h2>
            <p className="text-sm text-gray-500 mt-1">Заявка: {order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Глобальная причина */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Причина обновления (применится ко всем товарам):
              </label>
              <input
                type="text"
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: Новый прайс от поставщика"
              />
            </div>

            {/* Список товаров */}
            <div className="space-y-3">
              {priceUpdates.map((item, index) => {
                const costDiff = getPriceDiff(item.currentCostPrice, item.newCostPrice);
                const sellingDiff = getPriceDiff(
                  item.currentSellingPrice,
                  item.newSellingPrice
                );

                return (
                  <div
                    key={item.productId}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                        <p className="text-sm text-gray-500">Артикул: {item.productArticle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyPriceFromOrder(index)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        Применить цену из заявки
                      </button>
                    </div>

                    {/* Текущие цены */}
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Текущая себестоимость:</span>
                        <div className="font-semibold text-gray-900">
                          {formatPrice(item.currentCostPrice)} ₸
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Цена в заявке:</span>
                        <div className="font-semibold text-blue-600">
                          {formatPrice(item.priceAtPurchase)} ₸
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Текущая цена продажи:</span>
                        <div className="font-semibold text-gray-900">
                          {formatPrice(item.currentSellingPrice)} ₸
                        </div>
                      </div>
                    </div>

                    {/* Обновление себестоимости */}
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.updateCostPrice}
                          onChange={(e) =>
                            handleUpdateField(index, 'updateCostPrice', e.target.checked)
                          }
                          className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Новая себестоимость
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.newCostPrice}
                              onChange={(e) =>
                                handleUpdateField(index, 'newCostPrice', e.target.value)
                              }
                              disabled={!item.updateCostPrice}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder={item.currentCostPrice.toString()}
                            />
                            {costDiff && (
                              <div
                                className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                                  costDiff.diff >= 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {costDiff.diff >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {costDiff.diff >= 0 ? '+' : ''}
                                {costDiff.percent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Обновление цены продажи */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.updateSellingPrice}
                          onChange={(e) =>
                            handleUpdateField(index, 'updateSellingPrice', e.target.checked)
                          }
                          className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Новая цена продажи
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.newSellingPrice}
                              onChange={(e) =>
                                handleUpdateField(index, 'newSellingPrice', e.target.value)
                              }
                              disabled={!item.updateSellingPrice}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                              placeholder={item.currentSellingPrice.toString()}
                            />
                            {sellingDiff && (
                              <div
                                className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                                  sellingDiff.diff >= 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {sellingDiff.diff >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {sellingDiff.diff >= 0 ? '+' : ''}
                                {sellingDiff.percent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Выбрано товаров:{' '}
                {priceUpdates.filter((p) => p.updateCostPrice || p.updateSellingPrice).length}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Обновление...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Обновить цены</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
