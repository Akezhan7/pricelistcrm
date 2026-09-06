import React, { useCallback, useEffect, useState } from 'react';
import { ListPlus, PackageCheck, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../context/ToastContext';
import productsApi, { ProductLifecycleOperations } from '../services/productsApi';
import procurementListsApi, { ProcurementListItem } from '../services/procurementListsApi';
import type { ProductWorkflowItem } from '../types';
import { formatPriceKZT } from '../utils/format';
import { Alert, Badge, Button, Input, Spinner, Textarea } from './ui';
import { RequirementsChecklist, type RequirementItem } from './RequirementsChecklist';

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
  const navigate = useNavigate();
  const [operations, setOperations] = useState<ProductLifecycleOperations | null>(null);
  const [procurementItem, setProcurementItem] = useState<ProcurementListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const canEdit = Boolean(product.permissions?.allowedActions.includes('manage_purchase'));
  const purchase = operations?.purchase || null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lifecycleOperations, procurementData] = await Promise.all([
        productsApi.getLifecycleOperations(product.id),
        procurementListsApi.getCurrent(),
      ]);
      setOperations(lifecycleOperations);

      if (lifecycleOperations.purchase) {
        setReceivedQuantity(String(lifecycleOperations.purchase.quantity));
      } else {
        const existingItem = procurementData.list?.items.find(
          (item) => Number(item.productId) === Number(product.id)
        ) || null;
        setProcurementItem(existingItem);
        if (existingItem) {
          setQuantity(String(existingItem.requestedQuantity));
          setNotes(existingItem.notes || '');
        }
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

  const handleAddToProcurementList = async () => {
    setAddingToList(true);
    setError('');
    try {
      const data = await procurementListsApi.addItem(product.id, {
        requestedQuantity: Number(quantity),
        notes: notes.trim() || null,
      });
      const savedItem = data.list?.items.find(
        (item) => Number(item.productId) === Number(product.id)
      ) || null;
      setProcurementItem(savedItem);
      toast.success(procurementItem ? 'Количество в закупочном листе обновлено' : 'Товар добавлен в закупочный лист');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось добавить товар в закупочный лист'));
    } finally {
      setAddingToList(false);
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

  const purchaseReady = Number.isInteger(Number(quantity)) && Number(quantity) > 0;
  const arrivalReady = Number(receivedQuantity) > 0;
  const purchaseRequirements: RequirementItem[] = purchase
    ? [
        {
          label: 'Фактическое количество поступления указано',
          met: Number(receivedQuantity) > 0,
        },
      ]
    : [
        {
          label: 'Количество больше 0',
          met: purchaseReady,
        },
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">Товар</p>
          <h3 className="text-section-title text-brand-black">{product.name}</h3>
          <p className="mt-1 text-body text-text-muted">{product.article}</p>
        </div>
        <Badge variant="outline">{procurementItem ? 'В закупочном листе' : 'Первичный закуп'}</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!purchase ? (
        <>
          {procurementItem && (
            <Alert variant="info">В закупочном листе: {procurementItem.requestedQuantity} шт.</Alert>
          )}
          <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
            <Input
              label="Количество"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
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
          <RequirementsChecklist items={purchaseRequirements} />
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
              {procurementItem && (
                <Button
                  type="button"
                  variant="secondary"
                  leftIcon={ListPlus}
                  disabled={addingToList}
                  onClick={() => navigate('/procurement-list')}
                >
                  Открыть закупочный лист
                </Button>
              )}
              <Button
                type="button"
                leftIcon={ShoppingCart}
                loading={addingToList}
                disabled={addingToList || !purchaseReady}
                onClick={handleAddToProcurementList}
              >
                {procurementItem ? 'Обновить количество' : 'Закупить'}
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
          <RequirementsChecklist items={purchaseRequirements} />
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
