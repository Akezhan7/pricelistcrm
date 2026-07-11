import React, { useCallback, useEffect, useState } from 'react';
import { PackageCheck, ShoppingCart } from 'lucide-react';
import { toast } from '../context/ToastContext';
import productsApi, { ProductLifecycleOperations } from '../services/productsApi';
import type { Product, ProductWorkflowItem } from '../types';
import { formatPriceKZT } from '../utils/format';
import { Alert, Badge, Button, Input, Select, Spinner, Textarea } from './ui';

type ProductPurchaseActionsProps = {
  product: ProductWorkflowItem;
  onChanged: () => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

export const ProductPurchaseActions: React.FC<ProductPurchaseActionsProps> = ({
  product,
  onChanged,
}) => {
  const [details, setDetails] = useState<Product | null>(null);
  const [operations, setOperations] = useState<ProductLifecycleOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const canEdit = Boolean(product.permissions?.allowedActions.includes('manage_purchase'));
  const purchase = operations?.purchase || null;
  const suppliers = details?.suppliers || [];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productDetails, lifecycleOperations] = await Promise.all([
        productsApi.getProductById(product.id),
        productsApi.getLifecycleOperations(product.id),
      ]);
      setDetails(productDetails);
      setOperations(lifecycleOperations);

      if (lifecycleOperations.purchase) {
        setReceivedQuantity(String(lifecycleOperations.purchase.quantity));
      } else if (productDetails.suppliers?.length) {
        const firstSupplier = productDetails.suppliers[0];
        setSupplierId(String(firstSupplier.id));
        setPurchasePrice(String(firstSupplier.ProductSupplier.supplierPrice));
      }
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить данные закупа'));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === supplierId);

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    const supplier = suppliers.find((item) => String(item.id) === value);
    if (supplier) setPurchasePrice(String(supplier.ProductSupplier.supplierPrice));
  };

  const handlePurchase = async () => {
    setSaving(true);
    setError('');
    try {
      await productsApi.markProductPurchased(product.id, {
        supplierId: Number(supplierId),
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice),
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Первичный закуп оформлен');
      onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось оформить закуп'));
    } finally {
      setSaving(false);
    }
  };

  const handleArrival = async () => {
    setSaving(true);
    setError('');
    try {
      await productsApi.markProductArrived(product.id, {
        receivedQuantity: Number(receivedQuantity),
        notes: notes.trim() || undefined,
      });
      toast.success('Поступление подтверждено');
      onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось подтвердить поступление'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-text-muted">
        <Spinner size="sm" color="brand" />
        <span className="text-body">Загрузка закупа...</span>
      </div>
    );
  }

  const purchaseReady = Boolean(
    supplierId && Number(quantity) > 0 && Number(purchasePrice) >= 0
  );
  const arrivalReady = Number(receivedQuantity) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">Товар</p>
          <h3 className="text-section-title text-brand-black">{product.name}</h3>
          <p className="mt-1 text-body text-text-muted">{product.article}</p>
        </div>
        <Badge variant="outline">Первичный закуп</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!purchase ? (
        <>
          {suppliers.length === 0 && (
            <Alert variant="warning">Сначала привяжите к товару хотя бы одного поставщика.</Alert>
          )}
          <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
            <Select
              label="Поставщик"
              value={supplierId}
              onChange={(event) => handleSupplierChange(event.target.value)}
              disabled={!canEdit || suppliers.length === 0}
            >
              <option value="">Выберите поставщика</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Количество"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                disabled={!canEdit}
              />
              <Input
                label="Закупочная цена за единицу"
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(event.target.value)}
                disabled={!canEdit}
                helperText={selectedSupplier ? `Цена поставщика: ${formatPriceKZT(selectedSupplier.ProductSupplier.supplierPrice)}` : undefined}
              />
            </div>
            <Input
              label="Ожидаемая дата поставки"
              type="date"
              value={expectedDeliveryDate}
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
              disabled={!canEdit}
            />
            <Textarea
              label="Комментарий"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!canEdit}
              className="resize-none"
            />
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <Button
                type="button"
                leftIcon={ShoppingCart}
                loading={saving}
                disabled={saving || !purchaseReady}
                onClick={handlePurchase}
              >
                Оформить закуп
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-body sm:grid-cols-4">
            <div><p className="text-caption text-text-muted">Заявка</p><p className="font-medium">{purchase.order?.orderNumber || `#${purchase.orderId}`}</p></div>
            <div><p className="text-caption text-text-muted">Поставщик</p><p className="font-medium">{purchase.supplier?.name || `#${purchase.supplierId}`}</p></div>
            <div><p className="text-caption text-text-muted">Количество</p><p className="font-medium tabular-nums">{purchase.quantity} шт.</p></div>
            <div><p className="text-caption text-text-muted">Цена</p><p className="font-medium tabular-nums">{formatPriceKZT(purchase.purchasePrice)}</p></div>
          </div>
          <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
            <Input
              label="Фактически поступило"
              type="number"
              min="1"
              step="1"
              value={receivedQuantity}
              onChange={(event) => setReceivedQuantity(event.target.value)}
              disabled={!canEdit}
            />
            <Textarea
              label="Комментарий к приемке"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!canEdit}
              className="resize-none"
            />
          </div>
          <Alert variant="info">После подтверждения остаток увеличится, а товар перейдет в очередь склада.</Alert>
          {canEdit && (
            <div className="flex justify-end">
              <Button
                type="button"
                leftIcon={PackageCheck}
                loading={saving}
                disabled={saving || !arrivalReady}
                onClick={handleArrival}
              >
                Подтвердить поступление
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
