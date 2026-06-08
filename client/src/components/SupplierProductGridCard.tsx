import React from 'react';
import { Check, Edit, Users } from 'lucide-react';
import type { ProductWithPrice } from '../types';
import { getSupplierListPrice } from '../utils/orderItems';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';
import { IconButton, Input } from './ui';

export interface SupplierProductGridCardProps {
  product: ProductWithPrice;
  selected?: boolean;
  quantity?: number;
  onToggleSelect?: () => void;
  onQuantityChange?: (quantity: number) => void;
  canEdit?: boolean;
  onEditProduct?: (product: ProductWithPrice) => void;
  onManageSuppliers?: (product: ProductWithPrice) => void;
  loadingProductId?: number | null;
}

const priceFormat = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

export const SupplierProductGridCard: React.FC<SupplierProductGridCardProps> = ({
  product,
  selected = false,
  quantity = 1,
  onToggleSelect,
  onQuantityChange,
  canEdit = false,
  onEditProduct,
  onManageSuppliers,
  loadingProductId = null,
}) => {
  const supplierPrice = getSupplierListPrice(product);
  const showEditActions = canEdit && (onEditProduct || onManageSuppliers);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-brand-white p-3 transition-[colors,shadow] duration-200 ease-product',
        selected
          ? 'border-l-4 border-l-brand-yellow bg-brand-yellow/5 border-border-subtle shadow-sm'
          : 'border-border-subtle hover:shadow-card-hover'
      )}
    >
      {showEditActions && (
        <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-inset/60 p-0.5">
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

      <div className={cn('flex items-start gap-2', showEditActions && 'pr-14')}>
        {onToggleSelect && (
          <button
            type="button"
            onClick={onToggleSelect}
            className="shrink-0 flex items-center justify-center p-2 -m-2 md:p-1 md:-m-1"
            title={selected ? 'Снять выбор' : 'Выбрать товар'}
          >
            <span
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200',
                selected
                  ? 'bg-brand-yellow border-brand-yellow text-brand-black'
                  : 'border-border hover:border-brand-yellow bg-brand-white'
              )}
            >
              {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </span>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-card-title text-brand-black leading-snug line-clamp-2">{product.name}</h3>
          {product.article && (
            <p className="text-caption text-text-muted truncate mt-0.5">{product.article}</p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-text-muted">Себес</span>
          <span className="text-caption tabular-nums text-text-muted">
            {formatPriceKZT(product.costPrice, priceFormat)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-text-muted">Закуп</span>
          <span className="text-price tabular-nums text-brand-black">
            {formatPriceKZT(supplierPrice, priceFormat)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-text-muted">Продажа</span>
          <span className="text-caption tabular-nums text-text-muted">
            {formatPriceKZT(product.sellingPrice, priceFormat)}
          </span>
        </div>
      </div>

      {selected && onQuantityChange && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <Input
            type="number"
            min={1}
            label="Кол-во"
            value={quantity}
            onChange={(e) => onQuantityChange(Number(e.target.value))}
            className="text-center py-2 min-h-10"
          />
        </div>
      )}
    </div>
  );
};
