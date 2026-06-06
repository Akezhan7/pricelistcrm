import React, { useMemo } from 'react';
import { Search, Image as ImageIcon, Check, Plus, Loader2 } from 'lucide-react';
import type { ProductWithPrice } from '../types';
import getImageUrl from '../utils/image';
import { filterProductsBySearch, getSupplierListPrice } from '../utils/orderItems';

type CatalogMode = 'pick' | 'select';

interface SupplierProductCatalogProps {
  products: ProductWithPrice[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  mode: CatalogMode;
  className?: string;
  listMaxHeight?: string;
  /** pick: добавить в заявку */
  onPickProduct?: (product: ProductWithPrice) => void;
  pickedProductIds?: Set<number>;
  /** select: чекбоксы (панель поставщика) */
  selectedIds?: Set<number>;
  onToggleSelect?: (productId: number) => void;
  quantities?: Record<number, number>;
  onQuantityChange?: (productId: number, quantity: number) => void;
}

const formatPrice = (n: number | string) =>
  new Intl.NumberFormat('ru-RU').format(Number(n) || 0);

export const SupplierProductCatalog: React.FC<SupplierProductCatalogProps> = ({
  products,
  loading = false,
  search,
  onSearchChange,
  mode,
  className = '',
  listMaxHeight = 'max-h-64',
  onPickProduct,
  pickedProductIds,
  selectedIds,
  onToggleSelect,
  quantities,
  onQuantityChange,
}) => {
  const filtered = useMemo(
    () => filterProductsBySearch(products, search),
    [products, search]
  );

  const accentSelected =
    mode === 'pick'
      ? 'bg-blue-50 border-l-4 border-blue-400'
      : 'bg-yellow-50 border-l-4 border-yellow-400';

  const listScrollClass =
    listMaxHeight === 'fill'
      ? 'flex-1 min-h-0'
      : listMaxHeight;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="relative mb-3 flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск товара по названию или артикулу..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={loading}
        />
      </div>

      <div
        className={`border border-gray-200 rounded-lg overflow-y-auto bg-white ${listScrollClass}`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Загрузка товаров...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <div className="text-3xl mb-2">📦</div>
            <p>{search.trim() ? 'Товары не найдены' : 'У поставщика нет товаров'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((product) => {
              const supplierPrice = getSupplierListPrice(product);
              const isPicked = pickedProductIds?.has(product.id);
              const isSelected = selectedIds?.has(product.id);

              return (
                <div
                  key={product.id}
                  className={`p-3 transition-colors ${
                    isSelected || isPicked ? accentSelected : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {mode === 'select' && onToggleSelect && (
                      <button
                        type="button"
                        onClick={() => onToggleSelect(product.id)}
                        className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                          isSelected
                            ? 'bg-yellow-400 border-yellow-500 text-black'
                            : 'border-gray-300 hover:border-yellow-400 bg-white'
                        }`}
                        title={isSelected ? 'Снять выбор' : 'Выбрать товар'}
                      >
                        {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                      </button>
                    )}

                    <div className="flex-shrink-0">
                      {product.image ? (
                        <img
                          src={getImageUrl(product.image) || undefined}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.onerror = null;
                            el.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 leading-tight">
                        {product.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{product.article}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-green-700 font-semibold">
                          {formatPrice(supplierPrice)} ₸
                        </span>
                        <span className="text-gray-400">
                          себ-ть {formatPrice(product.costPrice)} ₸
                        </span>
                      </div>
                    </div>

                    {mode === 'select' && isSelected && onQuantityChange && (
                      <div className="flex-shrink-0">
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">
                          Кол-во
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={quantities?.[product.id] || 1}
                          onChange={(e) =>
                            onQuantityChange(product.id, Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center"
                        />
                      </div>
                    )}

                    {mode === 'pick' && onPickProduct && (
                      <button
                        type="button"
                        onClick={() => onPickProduct(product)}
                        disabled={isPicked}
                        className="flex-shrink-0 mt-1 p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={isPicked ? 'Уже в заявке' : 'Добавить в заявку'}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
