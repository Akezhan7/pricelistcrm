import React, { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import productsApi from '../services/productsApi';
import { toast } from '../context/ToastContext';
import type { ProductWorkflowItem, SupplierWithPrice } from '../types';
import { formatPriceKZT } from '../utils/format';
import { Alert, Button, Input, Textarea } from './ui';

type ProductBulkPurchaseActionsProps = {
  products: ProductWorkflowItem[];
  supplierId: number;
  onChanged: () => void;
};

type RowState = {
  productId: number;
  quantity: string;
  purchasePrice: string;
  notes: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

function getSupplier(product: ProductWorkflowItem, supplierId: number): SupplierWithPrice | null {
  return product.suppliers?.find((supplier) => Number(supplier.id) === Number(supplierId)) || null;
}

export const ProductBulkPurchaseActions: React.FC<ProductBulkPurchaseActionsProps> = ({
  products,
  supplierId,
  onChanged,
}) => {
  const [rows, setRows] = useState<RowState[]>(() =>
    products.map((product) => {
      const supplier = getSupplier(product, supplierId);
      return {
        productId: product.id,
        quantity: '1',
        purchasePrice: supplier?.ProductSupplier?.supplierPrice === undefined
          ? ''
          : String(supplier.ProductSupplier.supplierPrice),
        notes: '',
      };
    })
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supplier = useMemo(() => getSupplier(products[0], supplierId), [products, supplierId]);
  const totalAmount = rows.reduce((sum, row) => {
    const quantity = Number(row.quantity);
    const price = Number(row.purchasePrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return sum;
    return sum + quantity * price;
  }, 0);
  const isReady = rows.length > 0 && rows.every((row) =>
    Number(row.quantity) > 0 &&
    Number.isInteger(Number(row.quantity)) &&
    Number(row.purchasePrice) >= 0 &&
    row.purchasePrice.trim().length > 0
  );

  const updateRow = (productId: number, patch: Partial<RowState>) => {
    setRows((current) =>
      current.map((row) => (row.productId === productId ? { ...row, ...patch } : row))
    );
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);

    try {
      const result = await productsApi.markProductsPurchasedBulk({
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryLocation: deliveryLocation.trim() || undefined,
        notes: notes.trim() || undefined,
        items: rows.map((row) => ({
          productId: row.productId,
          quantity: Number(row.quantity),
          purchasePrice: Number(row.purchasePrice),
          notes: row.notes.trim() || undefined,
        })),
      });
      toast.success(`Заявка ${result.order.orderNumber} создана`);
      onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось оформить пакетный закуп'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-surface-muted p-3">
        <p className="text-caption text-text-muted">Поставщик</p>
        <p className="text-card-title text-brand-black">{supplier?.name || `#${supplierId}`}</p>
        <p className="mt-1 text-body text-text-muted">
          {products.length} позиций, сумма {formatPriceKZT(totalAmount)}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="space-y-3">
        {products.map((product) => {
          const row = rows.find((item) => item.productId === product.id);
          if (!row) return null;

          return (
            <div key={product.id} className="rounded-lg border border-border-subtle bg-brand-white p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-card-title text-brand-black">{product.name}</h3>
                  <p className="text-caption text-text-muted">{product.article}</p>
                </div>
                <p className="text-body font-medium tabular-nums text-brand-black">
                  {formatPriceKZT(Number(row.quantity || 0) * Number(row.purchasePrice || 0))}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Количество"
                  type="number"
                  min="1"
                  step="1"
                  value={row.quantity}
                  onChange={(event) => updateRow(product.id, { quantity: event.target.value })}
                />
                <Input
                  label="Закупочная цена"
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.purchasePrice}
                  onChange={(event) => updateRow(product.id, { purchasePrice: event.target.value })}
                />
              </div>
              <Textarea
                label="Комментарий к позиции"
                rows={2}
                value={row.notes}
                onChange={(event) => updateRow(product.id, { notes: event.target.value })}
                className="mt-3 resize-none"
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Ожидаемая дата поставки"
          type="date"
          value={expectedDeliveryDate}
          onChange={(event) => setExpectedDeliveryDate(event.target.value)}
        />
        <Input
          label="Место доставки"
          value={deliveryLocation}
          onChange={(event) => setDeliveryLocation(event.target.value)}
          placeholder="Точка Байсад"
        />
      </div>
      <Textarea
        label="Комментарий к заявке"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="resize-none"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          leftIcon={ShoppingCart}
          loading={saving}
          disabled={saving || !isReady}
          onClick={handleSubmit}
        >
          Создать одну заявку
        </Button>
      </div>
    </div>
  );
};
