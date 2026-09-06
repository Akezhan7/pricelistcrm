import React from 'react';

import { Image as ImageIcon, Store } from 'lucide-react';

import type { Product } from '../types';

import getImageUrl from '../utils/image';

import { formatPriceKZT } from '../utils/format';

import { cn } from '../utils/cn';

import { Badge } from './ui';

import { getProductLifecycleLabel } from '../constants/productLifecycle';



export interface ProductListItemProps {

  product: Pick<Product, 'id' | 'name' | 'article' | 'image' | 'costPrice' | 'sellingPrice' | 'lifecycleStatus' | 'lifecycleStartedAt'> & {

    suppliers?: Product['suppliers'];

  };

  /** Override selling/supplier price display */

  displayPrice?: number;

  displayPriceLabel?: string;

  showCostPrice?: boolean;

  costPriceLabel?: string;

  selected?: boolean;

  className?: string;

  imageSize?: 'sm' | 'md';

  onClick?: () => void;

  children?: React.ReactNode;

  footer?: React.ReactNode;

  density?: 'default' | 'compact';

}



const imageSizeClasses = {

  sm: 'h-12 w-12',

  md: 'h-12 w-12',

};



export const ProductListItem: React.FC<ProductListItemProps> = ({

  product,

  displayPrice,

  displayPriceLabel,

  showCostPrice = true,

  costPriceLabel = 'Себ-ть:',

  selected = false,

  className,

  imageSize = 'sm',

  onClick,

  children,

  footer,

  density = 'default',

}) => {

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {

    const el = e.currentTarget;

    el.onerror = null;

    el.src = '/placeholder.svg';

  };



  const imgClass = imageSizeClasses[imageSize];
  const isCompact = density === 'compact';

  const isLegacyCatalogProduct =
    product.lifecycleStatus === 'in_sale' && !product.lifecycleStartedAt;
  const lifecycleLabel = isLegacyCatalogProduct
    ? 'Старый каталог'
    : getProductLifecycleLabel(product.lifecycleStatus);



  const renderPriceColumn = () => {

    if (displayPrice !== undefined) {

      return (

        <div className="flex flex-col items-end gap-0.5 shrink-0">

          {displayPriceLabel && (

            <span className="text-caption text-text-muted">{displayPriceLabel}</span>

          )}

          <span className="text-price tabular-nums text-brand-black">

            {formatPriceKZT(displayPrice, {

              minimumFractionDigits: 0,

              maximumFractionDigits: 0,

            })}

          </span>

          {showCostPrice && (

            <span className="text-caption text-text-muted tabular-nums">

              {costPriceLabel}{' '}

              {formatPriceKZT(product.costPrice, {

                minimumFractionDigits: 0,

                maximumFractionDigits: 0,

              })}

            </span>

          )}

        </div>

      );

    }



    return (

      <div className="flex flex-col items-end gap-0.5 shrink-0">

        <span className="text-price tabular-nums text-brand-black">

          {formatPriceKZT(product.sellingPrice, {

            minimumFractionDigits: 0,

            maximumFractionDigits: 0,

          })}

        </span>

        {showCostPrice && (

          <span className="text-caption text-text-muted tabular-nums">

            {costPriceLabel}{' '}

            {formatPriceKZT(product.costPrice, {

              minimumFractionDigits: 0,

              maximumFractionDigits: 0,

            })}

          </span>

        )}

      </div>

    );

  };



  return (

    <div

      className={cn(

        'group relative flex rounded-xl border bg-brand-white',
        isCompact ? 'flex-row items-center hover:z-10 focus-within:z-20' : 'flex-col',

        'transition-[colors,shadow,transform] duration-200 ease-product',

        selected

          ? 'border-l-4 border-l-brand-yellow bg-brand-yellow/5 border-border-subtle shadow-sm'

          : 'border-border-subtle hover:shadow-card-hover hover:-translate-y-px',

        onClick && 'cursor-pointer active:scale-[0.99]',

        onClick &&

          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2',

        className

      )}

      onClick={onClick}

      role={onClick ? 'button' : undefined}

      tabIndex={onClick ? 0 : undefined}

      onKeyDown={

        onClick

          ? (e) => {

              if (e.key === 'Enter' || e.key === ' ') {

                e.preventDefault();

                onClick();

              }

            }

          : undefined

      }

    >

      <div className={cn(
        'product-list-item-main flex min-w-0 flex-1 items-center gap-3',
        isCompact ? 'min-h-[68px] px-3 py-2.5' : 'p-3 lg:p-4 min-h-[72px] lg:min-h-16'
      )}>

        <div className="shrink-0">

          {product.image ? (

            <img

              src={getImageUrl(product.image) || undefined}

              alt={product.name}

              className={cn(imgClass, 'rounded-thumbnail object-cover border border-border-subtle')}

              onError={handleImgError}

            />

          ) : (

            <div

              className={cn(

                imgClass,

                'rounded-thumbnail flex items-center justify-center border border-border-subtle bg-surface-inset'

              )}

            >

              <ImageIcon className="h-5 w-5 text-text-muted" />

            </div>

          )}

        </div>



        <div className="flex-1 min-w-0">

          <h3

            className="text-card-title text-brand-black leading-snug overflow-hidden"

            style={{

              display: '-webkit-box',

              WebkitLineClamp: 2,

              WebkitBoxOrient: 'vertical',

            }}

          >

            {product.name}

          </h3>

          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <p className="text-caption text-text-muted truncate">{product.article}</p>
            {lifecycleLabel && (
              <Badge variant="outline" className="shrink-0">
                {lifecycleLabel}
              </Badge>
            )}
            {isCompact && product.suppliers && product.suppliers.length > 0 && (
              <span className="hidden items-center gap-1 text-caption text-accent md:inline-flex">
                <Store className="h-3 w-3 shrink-0" aria-hidden />
                {product.suppliers.length}{' '}
                {product.suppliers.length === 1 ? 'поставщик' : 'поставщиков'}
              </span>
            )}
          </div>

          {!isCompact && product.suppliers && product.suppliers.length > 0 && (

            <p className="flex items-center gap-1 text-caption text-accent mt-1">

              <Store className="h-3 w-3 shrink-0" aria-hidden />

              <span>

                {product.suppliers.length}{' '}

                {product.suppliers.length === 1 ? 'поставщик' : 'поставщиков'}

              </span>

            </p>

          )}

        </div>



        {renderPriceColumn()}



        {children && (

          <div
            className="shrink-0 flex items-center gap-2"

            onClick={(e) => e.stopPropagation()}

          >

            {children}

          </div>

        )}

      </div>



      {footer && (

        <div

          className={cn(
            'product-list-item-footer shrink-0',
            isCompact
              ? 'py-2 pr-2'
              : 'px-3 pb-3 lg:px-4 lg:pb-4 pt-0 border-t border-border-subtle lg:border-t-0'
          )}

          onClick={(e) => e.stopPropagation()}

        >

          {footer}

        </div>

      )}

    </div>

  );

};

