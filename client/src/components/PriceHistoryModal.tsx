import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Clock, User, FileText, Package } from 'lucide-react';
import { PriceHistory, PriceHistoryResponse, PriceType } from '../types';
import { getProductPriceHistory } from '../services/priceHistoryApi';

type PriceHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
};

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [error, setError] = useState('');
  const [priceTypeFilter, setPriceTypeFilter] = useState<PriceType | 'all'>('all');
  const [page, setPage] = useState(1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && productId) {
      fetchPriceHistory();
    }
  }, [isOpen, productId, priceTypeFilter, page]);

  const fetchPriceHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const params: any = { page, limit: 20 };
      if (priceTypeFilter !== 'all') {
        params.priceType = priceTypeFilter;
      }

      const response = await getProductPriceHistory(productId, params);
      setData(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки истории цен');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('ru-RU').format(Number(price));
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getPriceChange = (oldPrice: string | number, newPrice: string | number) => {
    const diff = Number(newPrice) - Number(oldPrice);
    const percent = Number(oldPrice) > 0 ? (diff / Number(oldPrice)) * 100 : 0;
    return { diff, percent };
  };

  const getPriceTypeLabel = (type: PriceType) => {
    return type === 'costPrice' ? 'Себестоимость' : 'Цена продажи';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">История цен</h2>
            <p className="text-sm text-gray-500 mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Stats */}
        {data && data.stats && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Текущая себестоимость</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(data.stats.currentCostPrice)} ₸
                </div>
                {data.stats.costPriceChangePercent && (
                  <div
                    className={`text-sm mt-1 flex items-center ${
                      Number(data.stats.costPriceChangePercent) >= 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {Number(data.stats.costPriceChangePercent) >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(Number(data.stats.costPriceChangePercent))}%
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Текущая цена продажи</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(data.stats.currentSellingPrice)} ₸
                </div>
                {data.stats.sellingPriceChangePercent && (
                  <div
                    className={`text-sm mt-1 flex items-center ${
                      Number(data.stats.sellingPriceChangePercent) >= 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {Number(data.stats.sellingPriceChangePercent) >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(Number(data.stats.sellingPriceChangePercent))}%
                  </div>
                )}
              </div>

              {data.stats.firstCostPrice && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Первая себестоимость</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {formatPrice(data.stats.firstCostPrice)} ₸
                  </div>
                </div>
              )}

              {data.stats.firstSellingPrice && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Первая цена продажи</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {formatPrice(data.stats.firstSellingPrice)} ₸
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Тип цены:</span>
            <button
              onClick={() => setPriceTypeFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                priceTypeFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setPriceTypeFilter('costPrice')}
              className={`px-3 py-1 rounded text-sm ${
                priceTypeFilter === 'costPrice'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Себестоимость
            </button>
            <button
              onClick={() => setPriceTypeFilter('sellingPrice')}
              className={`px-3 py-1 rounded text-sm ${
                priceTypeFilter === 'sellingPrice'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Цена продажи
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && data && data.history.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>История изменений цен пуста</p>
            </div>
          )}

          {!loading && !error && data && data.history.length > 0 && (
            <div className="space-y-4">
              {data.history.map((item: PriceHistory) => {
                const { diff, percent } = getPriceChange(item.oldPrice, item.newPrice);
                const isIncrease = diff > 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              item.priceType === 'costPrice'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {getPriceTypeLabel(item.priceType)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              isIncrease
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {isIncrease ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {isIncrease ? '+' : ''}
                            {percent.toFixed(2)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Старая цена:</span>
                            <span className="ml-2 font-medium text-gray-700">
                              {formatPrice(item.oldPrice)} ₸
                            </span>
                          </div>
                          <div className="text-gray-400">→</div>
                          <div>
                            <span className="text-gray-500">Новая цена:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {formatPrice(item.newPrice)} ₸
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            isIncrease ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {isIncrease ? '+' : ''}
                          {formatPrice(Math.abs(diff))} ₸
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-gray-500 pt-3 border-t border-gray-100">
                      {item.changer && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{item.changer.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(item.changedAt)}</span>
                      </div>

                      {item.order && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>Заявка: {item.order.orderNumber}</span>
                        </div>
                      )}
                    </div>

                    {item.changeReason && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Причина:</span> {item.changeReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="text-sm text-gray-600">
                Страница {page} из {data.pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
