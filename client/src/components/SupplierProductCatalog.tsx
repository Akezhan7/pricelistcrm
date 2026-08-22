import React, { useMemo } from 'react';
import { Search, Check, Plus, Minus, Loader2, Edit, Users, Package, X } from 'lucide-react';
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
  emptyTitle?: string;
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
  emptyTitle,
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

  const isFillHeight = listMaxHeight === 'fill';
  const listScrollClass = isFillHeight ? 'md:flex-1 md:min-h-0' : listMaxHeight;
  const listOverflowClass = isFillHeight
    ? 'overflow-x-hidden md:overflow-y-auto max-md:overflow-visible'
    : 'overflow-y-auto overflow-x-hidden';

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
        className={`${listOverflowClass} ${listScrollClass}`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10 text-text-muted gap-2">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-body">Загрузка товаров...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={emptyTitle || (search.trim() ? 'Товары не найдены' : 'У поставщика нет товаров')}
            className="py-10"
          />
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 px-1 pb-1">
            {filtered.map((product) => {
              const isPicked = pickedProductIds?.has(product.id);
              const isSelected = selectedIds?.has(product.id);
              const isHighlighted = isSelected || isPicked;

              if (mode === 'pick') {
                const quantity = quantities?.[product.id] || 1;
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
                    {isPicked && onQuantityChange ? (
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-subtle bg-surface-inset/60 p-1">
                        <IconButton
                          icon={Minus}
                          title="Уменьшить количество"
                          size="sm"
                          variant="ghost"
                          disabled={quantity <= 1}
                          onClick={() => onQuantityChange(product.id, quantity - 1)}
                        />
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          aria-label={`Количество: ${product.name}`}
                          onChange={(event) => onQuantityChange(product.id, Number(event.target.value))}
                          className="h-8 w-14 rounded-md border border-border bg-brand-white px-1 text-center text-body tabular-nums focus:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow/20"
                        />
                        <IconButton
                          icon={Plus}
                          title="Увеличить количество"
                          size="sm"
                          variant="ghost"
                          onClick={() => onQuantityChange(product.id, quantity + 1)}
                        />
                      </div>
                    ) : onPickProduct ? (
                      <IconButton
                        icon={Plus}
                        title="Добавить в заявку"
                        size="md"
                        variant="ghost"
                        className="text-accent hover:bg-surface-inset disabled:opacity-40"
                        onClick={() => onPickProduct(product)}
                      />
                    ) : null}
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

                  {mode === 'pick' && isPicked && onQuantityChange ? (
                    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-subtle bg-surface-inset/60 p-1">
                      <IconButton
                        icon={Minus}
                        title="Уменьшить количество"
                        size="sm"
                        variant="ghost"
                        disabled={(quantities?.[product.id] || 1) <= 1}
                        onClick={() => onQuantityChange(product.id, (quantities?.[product.id] || 1) - 1)}
                      />
                      <input
                        type="number"
                        min={1}
                        value={quantities?.[product.id] || 1}
                        aria-label={`Количество: ${product.name}`}
                        onChange={(event) => onQuantityChange(product.id, Number(event.target.value))}
                        className="h-8 w-14 rounded-md border border-border bg-brand-white px-1 text-center text-body tabular-nums focus:border-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow/20"
                      />
                      <IconButton
                        icon={Plus}
                        title="Увеличить количество"
                        size="sm"
                        variant="ghost"
                        onClick={() => onQuantityChange(product.id, (quantities?.[product.id] || 1) + 1)}
                      />
                    </div>
                  ) : mode === 'pick' && onPickProduct ? (
                    <IconButton
                      icon={Plus}
                      title="Добавить в заявку"
                      size="md"
                      variant="ghost"
                      className="text-accent hover:bg-surface-inset disabled:opacity-40"
                      onClick={() => onPickProduct(product)}
                    />
                  ) : null}

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
