import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, User, FileText, Package } from 'lucide-react';
import { PriceHistory, PriceHistoryResponse, PriceType } from '../types';
import { getProductPriceHistory } from '../services/priceHistoryApi';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Badge } from './ui/Badge';
import { Alert } from './ui/Alert';
import { FilterChip } from './ui/FilterChip';
import { Pagination } from './ui/Pagination';
import { Spinner } from './ui/Spinner';
import { cn } from '../utils/cn';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="История цен"
      size="xl"
      className="max-w-5xl"
      footer={<FormFooter onCancel={onClose} cancelLabel="Закрыть" showSubmit={false} />}
    >
      <p className="text-sm text-text-muted -mt-2 mb-4">{productName}</p>

        {/* Stats */}
        {data && data.stats && (
          <div className="p-4 sm:p-5 mb-4 rounded-xl bg-surface-inset border border-border-subtle">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-base p-4 rounded-xl border border-border-subtle">
                <div className="text-overline text-text-muted mb-1">Текущая себестоимость</div>
                <div className="text-metric font-tabular text-brand-black">
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

              <div className="bg-surface-base p-4 rounded-xl border border-border-subtle">
                <div className="text-overline text-text-muted mb-1">Текущая цена продажи</div>
                <div className="text-metric font-tabular text-brand-black">
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
                <div className="bg-surface-base p-4 rounded-xl border border-border-subtle">
                  <div className="text-overline text-text-muted mb-1">Первая себестоимость</div>
                  <div className="text-price font-tabular text-brand-black">
                    {formatPrice(data.stats.firstCostPrice)} ₸
                  </div>
                </div>
              )}

              {data.stats.firstSellingPrice && (
                <div className="bg-surface-base p-4 rounded-xl border border-border-subtle">
                  <div className="text-overline text-text-muted mb-1">Первая цена продажи</div>
                  <div className="text-price font-tabular text-brand-black">
                    {formatPrice(data.stats.firstSellingPrice)} ₸
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-caption font-medium text-text-muted">Тип цены:</span>
          <FilterChip
            active={priceTypeFilter === 'all'}
            onClick={() => setPriceTypeFilter('all')}
          >
            Все
          </FilterChip>
          <FilterChip
            active={priceTypeFilter === 'costPrice'}
            onClick={() => setPriceTypeFilter('costPrice')}
          >
            Себестоимость
          </FilterChip>
          <FilterChip
            active={priceTypeFilter === 'sellingPrice'}
            onClick={() => setPriceTypeFilter('sellingPrice')}
          >
            Цена продажи
          </FilterChip>
        </div>

        {/* Content */}
        <div>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="brand" useLucide />
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {!loading && !error && data && data.history.length === 0 && (
            <div className="text-center py-12 text-text-muted">
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
                    className="bg-surface-base border border-border-subtle rounded-xl p-4 transition-colors duration-200 hover:bg-surface-inset/40"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.priceType === 'costPrice' ? 'warning' : 'info'}>
                            {getPriceTypeLabel(item.priceType)}
                          </Badge>
                          <Badge variant={isIncrease ? 'danger' : 'success'}>
                            {isIncrease ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {isIncrease ? '+' : ''}
                            {percent.toFixed(2)}%
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-text-muted">Старая цена:</span>
                            <span className="ml-2 font-medium text-brand-black">
                              {formatPrice(item.oldPrice)} ₸
                            </span>
                          </div>
                          <div className="text-text-muted">→</div>
                          <div>
                            <span className="text-text-muted">Новая цена:</span>
                            <span className="ml-2 font-semibold text-brand-black">
                              {formatPrice(item.newPrice)} ₸
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            'text-price font-bold tabular-nums',
                            isIncrease ? 'text-danger' : 'text-success'
                          )}
                        >
                          {isIncrease ? '+' : ''}
                          {formatPrice(Math.abs(diff))} ₸
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-text-muted pt-3 border-t border-border-subtle">
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
                      <div className="mt-2 text-sm text-text-muted bg-surface-inset p-2 rounded-lg">
                        <span className="font-medium">Причина:</span> {item.changeReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data?.pagination && data.pagination.pages > 1 && (
            <Pagination
              className="mt-6 pt-6 border-t border-border-subtle"
              currentPage={page}
              totalPages={data.pagination.pages}
              totalItems={data.pagination.total}
              itemsPerPage={20}
              onPageChange={setPage}
            />
          )}
        </div>
    </Modal>
  );
};
