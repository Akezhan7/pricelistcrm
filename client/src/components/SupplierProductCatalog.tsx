import React, { useMemo } from 'react';
import { Search, Check, Plus, Loader2, Edit, Users, Package, X } from 'lucide-react';
import type { ProductWithPrice } from '../types';
import { filterProductsBySearch, getSupplierListPrice } from '../utils/orderItems';
import { ProductListItem } from './ProductListItem';
import { SupplierProductGridCard } from './SupplierProductGridCard';
import { EmptyState, IconButton, Input } from './ui';

type CatalogMode = 'pick' | 'select';
type CatalogLayout = 'list' | 'grid';

interface SupplierProductCatalogProps {
  products: ProductWithPrice[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  mode: CatalogMode;
  layout?: CatalogLayout;
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
  canEdit?: boolean;
  onEditProduct?: (product: ProductWithPrice) => void;
  onManageSuppliers?: (product: ProductWithPrice) => void;
  loadingProductId?: number | null;
}

export const SupplierProductCatalog: React.FC<SupplierProductCatalogProps> = ({
  products,
  loading = false,
  search,
  onSearchChange,
  mode,
  layout = 'list',
  className = '',
  listMaxHeight = 'max-h-64',
  onPickProduct,
  pickedProductIds,
  selectedIds,
  onToggleSelect,
  quantities,
  onQuantityChange,
  canEdit = false,
  onEditProduct,
  onManageSuppliers,
  loadingProductId = null,
}) => {
  const filtered = useMemo(
    () => filterProductsBySearch(products, search),
    [products, search]
  );

  const listScrollClass =
    listMaxHeight === 'fill' ? 'flex-1 min-h-0' : listMaxHeight;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <div className="relative mb-3 shrink-0 px-1">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none z-10"
          aria-hidden
        />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск товара по названию или артикулу..."
          className="pl-10 pr-10 bg-surface-inset border-border-subtle focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
          disabled={loading}
        />
        {search && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <IconButton
              icon={X}
              title="Очистить поиск"
              size="sm"
              variant="ghost"
              onClick={() => onSearchChange('')}
            />
          </div>
        )}
      </div>

      <div
        className={`overflow-y-auto ${listScrollClass}`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10 text-text-muted gap-2">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-body">Загрузка товаров...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search.trim() ? 'Товары не найдены' : 'У поставщика нет товаров'}
            className="py-10"
          />
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 px-1 pb-1">
            {filtered.map((product) => {
              const isPicked = pickedProductIds?.has(product.id);
              const isSelected = selectedIds?.has(product.id);
              const isHighlighted = isSelected || isPicked;

              if (mode === 'pick') {
                return (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    imageSize="md"
                    displayPrice={getSupplierListPrice(product)}
                    showCostPrice
                    costPriceLabel="себ-ть"
                    selected={isHighlighted}
                    className="col-span-full"
                  >
                    {onPickProduct && (
                      <IconButton
                        icon={Plus}
                        title={isPicked ? 'Уже в заявке' : 'Добавить в заявку'}
                        size="md"
                        variant="ghost"
                        disabled={isPicked}
                        className="text-accent hover:bg-surface-inset disabled:opacity-40"
                        onClick={() => onPickProduct(product)}
                      />
                    )}
                  </ProductListItem>
                );
              }

              return (
                <SupplierProductGridCard
                  key={product.id}
                  product={product}
                  selected={isHighlighted}
                  quantity={quantities?.[product.id] || 1}
                  onToggleSelect={
                    onToggleSelect ? () => onToggleSelect(product.id) : undefined
                  }
                  onQuantityChange={
                    isSelected && onQuantityChange
                      ? (qty) => onQuantityChange(product.id, qty)
                      : undefined
                  }
                  canEdit={canEdit}
                  onEditProduct={onEditProduct}
                  onManageSuppliers={onManageSuppliers}
                  loadingProductId={loadingProductId}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 px-1 pb-1">
            {filtered.map((product) => {
              const supplierPrice = getSupplierListPrice(product);
              const isPicked = pickedProductIds?.has(product.id);
              const isSelected = selectedIds?.has(product.id);
              const isHighlighted = isSelected || isPicked;

              return (
                <ProductListItem
                  key={product.id}
                  product={product}
                  imageSize="md"
                  displayPrice={supplierPrice}
                  showCostPrice
                  costPriceLabel="себ-ть"
                  selected={isHighlighted}
                >
                  {mode === 'select' && onToggleSelect && (
                    <button
                      type="button"
                      onClick={() => onToggleSelect(product.id)}
                      className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors duration-200 ${
                        isSelected
                          ? 'bg-brand-yellow border-brand-yellow text-brand-black'
                          : 'border-border hover:border-brand-yellow bg-brand-white'
                      }`}
                      title={isSelected ? 'Снять выбор' : 'Выбрать товар'}
                    >
                      {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                    </button>
                  )}

                  {mode === 'select' && isSelected && onQuantityChange && (
                    <div className="shrink-0">
                      <label className="block text-caption text-text-muted uppercase mb-1 tracking-wider font-medium">
                        Кол-во
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quantities?.[product.id] || 1}
                        onChange={(e) =>
                          onQuantityChange(product.id, Number(e.target.value))
                        }
                        className="w-20 px-2 py-1.5 border border-border rounded-lg text-body text-center bg-surface-inset focus:outline-none focus:ring-2 focus:ring-brand-yellow/30 focus:border-brand-yellow"
                      />
                    </div>
                  )}

                  {mode === 'pick' && onPickProduct && (
                    <IconButton
                      icon={Plus}
                      title={isPicked ? 'Уже в заявке' : 'Добавить в заявку'}
                      size="md"
                      variant="ghost"
                      disabled={isPicked}
                      className="text-accent hover:bg-surface-inset disabled:opacity-40"
                      onClick={() => onPickProduct(product)}
                    />
                  )}

                  {canEdit && (onEditProduct || onManageSuppliers) && (
                    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-inset/60 p-0.5">
                      {onEditProduct && (
                        <IconButton
                          icon={Edit}
                          title="Редактировать товар"
                          size="sm"
                          variant="ghost"
                          disabled={loadingProductId === product.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(product);
                          }}
                        />
                      )}
                      {onManageSuppliers && (
                        <IconButton
                          icon={Users}
                          title="Цены и поставщики"
                          size="sm"
                          variant="ghost"
                          disabled={loadingProductId === product.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageSuppliers(product);
                          }}
                        />
                      )}
                    </div>
                  )}
                </ProductListItem>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
