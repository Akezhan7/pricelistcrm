import React, { useState } from 'react';

import { Trash2, PlusCircle } from 'lucide-react';

import type { Product, ProductVariation } from '../../types';

import { formatPriceKZT } from '../../utils/format';

import { cn } from '../../utils/cn';

import { Input } from '../ui/Input';

import { Button } from '../ui/Button';

import { Badge } from '../ui/Badge';

import { IconButton } from '../ui/IconButton';

import { toast } from '../../context/ToastContext';



export type OrderLineItemBase = {

  productId: number;

  product?: Product;

  productVariationId?: number | null;

  selectedVariation?: ProductVariation | null;

  quantity: number;

  priceAtPurchase: number;

  notes?: string;

  uniqueKey?: string;

};



export type OrderLineItemEdit = OrderLineItemBase & {

  id?: number;

  isDeleted?: boolean;

};



export interface OrderLineItemsEditorProps<T extends OrderLineItemBase> {

  items: T[];

  mode?: 'create' | 'edit';

  emptyMessage?: string;

  onUpdateQuantity: (index: number, quantity: number) => void;

  onUpdatePrice: (index: number, price: number) => void;

  onUpdateNotes: (index: number, notes: string) => void;

  onRemoveItem: (index: number) => void;

  onAddVariation?: (productIndex: number, variationId: number) => void;

  onRestoreItem?: (index: number) => void;

  isVariationTaken?: (productId: number, variationId: number) => boolean;

}



export function OrderLineItemsEditor<T extends OrderLineItemBase>({

  items,

  mode = 'create',

  emptyMessage = 'Нажмите «+» у товара в списке выше',

  onUpdateQuantity,

  onUpdatePrice,

  onUpdateNotes,

  onRemoveItem,

  onAddVariation,

  onRestoreItem,

  isVariationTaken,

}: OrderLineItemsEditorProps<T>) {

  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);



  const handleAddVariation = (productIndex: number, variationId: number) => {

    const sourceItem = items[productIndex];

    if (isVariationTaken?.(sourceItem.productId, variationId)) {

      toast.warning('Эта вариация уже добавлена в заявку');

      return;

    }

    onAddVariation?.(productIndex, variationId);

    setOpenDropdownIndex(null);

  };



  if (items.length === 0) {

    return (

      <div className="text-center py-8 text-text-muted border-2 border-dashed border-border-subtle rounded-xl bg-surface-inset text-sm">

        <p>{emptyMessage}</p>

      </div>

    );

  }



  return (

    <div className="space-y-3">

      {items.map((item, index) => {

        const editItem = item as OrderLineItemEdit;

        const isDeleted = mode === 'edit' && editItem.isDeleted;



        if (isDeleted) {

          return (

            <div

              key={item.uniqueKey || index}

              className="p-4 rounded-xl border border-danger/20 bg-danger-light/30 opacity-70"

            >

              <div className="flex items-center justify-between gap-3">

                <div className="flex-1 min-w-0">

                  <div className="text-sm font-medium text-danger truncate">

                    Удалено: {item.product?.name}

                    {item.selectedVariation &&

                      ` (${item.selectedVariation.name}: ${item.selectedVariation.value})`}

                  </div>

                  <div className="text-xs text-text-muted mt-0.5">

                    Будет удалено из заявки при сохранении

                  </div>

                </div>

                {onRestoreItem && (

                  <Button

                    type="button"

                    variant="secondary"

                    size="sm"

                    onClick={() => onRestoreItem(index)}

                  >

                    Восстановить

                  </Button>

                )}

              </div>

            </div>

          );

        }



        const rowClass = cn(

          'p-4 rounded-xl border border-border-subtle',

          mode === 'edit' && !editItem.id

            ? 'bg-surface-accent border-l-[3px] border-l-brand-yellow'

            : 'bg-surface-base'

        );



        return (

          <div key={item.uniqueKey || index} className={rowClass}>

            <div className="flex items-start gap-3">

              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 min-w-0">

                <div className="md:col-span-4">

                  <div className="flex items-center justify-between gap-2">

                    <div className="flex items-center gap-2 min-w-0">

                      {mode === 'edit' && !editItem.id && (

                        <Badge variant="success" className="flex-shrink-0">

                          Новый

                        </Badge>

                      )}

                      <div className="min-w-0">

                        <div className="text-body-medium text-brand-black truncate">

                          {item.product?.name}

                        </div>

                        <div className="text-caption text-text-muted">{item.product?.article}</div>

                      </div>

                    </div>



                    {item.product?.variations &&

                      item.product.variations.length > 0 &&

                      onAddVariation && (

                        <div className="relative flex-shrink-0">

                          <Button

                            type="button"

                            variant="ghost"

                            size="sm"

                            leftIcon={PlusCircle}

                            onClick={() =>

                              setOpenDropdownIndex(openDropdownIndex === index ? null : index)

                            }

                            className="text-accent text-xs"

                          >

                            Добавить вариацию

                          </Button>

                          {openDropdownIndex === index && (

                            <div className="absolute right-0 mt-1 w-64 bg-surface-overlay border border-border-subtle rounded-xl shadow-md z-10 max-h-48 overflow-y-auto">

                              {item.product.variations

                                .filter((v) => v.isActive)

                                .map((variation) => (

                                  <button

                                    key={variation.id}

                                    type="button"

                                    onClick={() => handleAddVariation(index, variation.id)}

                                    className="w-full px-3 py-2.5 text-left hover:bg-surface-inset/60 transition-colors border-b border-border-subtle last:border-0"

                                  >

                                    <div className="text-sm font-medium text-brand-black">

                                      {variation.name}: {variation.value}

                                    </div>

                                    <div className="text-xs text-text-muted">

                                      {formatPriceKZT(variation.price)}

                                      {variation.sku && (

                                        <span className="ml-1">({variation.sku})</span>

                                      )}

                                    </div>

                                  </button>

                                ))}

                            </div>

                          )}

                        </div>

                      )}

                  </div>

                </div>



                {item.selectedVariation && (

                  <div className="md:col-span-4 bg-surface-inset px-3 py-2 rounded-lg">

                    <div className="text-caption text-brand-black font-medium">

                      Вариация: {item.selectedVariation.name} — {item.selectedVariation.value}

                      {item.selectedVariation.sku && (

                        <span className="text-text-muted ml-1">({item.selectedVariation.sku})</span>

                      )}

                    </div>

                  </div>

                )}



                <Input

                  label="Количество"

                  type="number"

                  min={1}

                  value={item.quantity}

                  onChange={(e) => onUpdateQuantity(index, Number(e.target.value))}

                  className="text-sm"

                />



                <Input

                  label="Цена (₸)"

                  type="number"

                  min={0}

                  step="0.01"

                  value={item.priceAtPurchase}

                  onChange={(e) => onUpdatePrice(index, Number(e.target.value))}

                  className="text-sm"

                />



                <div className="md:col-span-2">

                  <Input

                    label="Заметки"

                    type="text"

                    value={item.notes || ''}

                    onChange={(e) => onUpdateNotes(index, e.target.value)}

                    placeholder="Дополнительная информация..."

                    className="text-sm"

                  />

                </div>



                <div className="md:col-span-4">

                  <div className="text-right text-price font-tabular text-brand-black">

                    Итого: {formatPriceKZT(item.quantity * item.priceAtPurchase)}

                  </div>

                </div>

              </div>



              <IconButton

                icon={Trash2}

                title="Удалить товар"

                variant="ghost"

                size="md"

                onClick={() => onRemoveItem(index)}

                className="text-danger hover:text-danger-dark hover:bg-danger-light/40 flex-shrink-0"

              />

            </div>

          </div>

        );

      })}

    </div>

  );

}

