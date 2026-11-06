import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { toast } from '../context/ToastContext';
import productsApi from '../services/productsApi';
import type { Product, ProductDumping } from '../types';
import { formatPriceKZT } from '../utils/format';
import { Alert, Badge, Button, Input, Spinner, Textarea } from './ui';

type ProductDumpingPanelProps = {
  product: Product;
  onChanged: () => void;
  showProductHeader?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

function toInput(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(Number(value));
}

export const ProductDumpingPanel: React.FC<ProductDumpingPanelProps> = ({
  product,
  onChanged,
  showProductHeader = false,
}) => {
  const [dumping, setDumping] = useState<ProductDumping | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allowedActions = product.permissions?.allowedActions || [];
  const canEdit = allowedActions.includes('manage_dumping');
  const onStage = product.lifecycleStatus === 'dumping' && allowedActions.includes('complete_dumping');

  const applyLoaded = useCallback((loaded: ProductDumping | null) => {
    setDumping(loaded);
    setMinPrice(toInput(loaded?.minPrice));
    setMaxPrice(toInput(loaded?.maxPrice));
    setNotes(loaded?.notes || '');
  }, []);

  const loadDumping = useCallback(async () => {
    setLoading(true);
    try {
      applyLoaded(await productsApi.getProductDumping(product.id));
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить параметры демпинга'));
    } finally {
      setLoading(false);
    }
  }, [product.id, applyLoaded]);

  useEffect(() => {
    loadDumping();
  }, [loadDumping]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-text-muted">
        <Spinner size="sm" color="brand" />
        <span className="text-body">Загрузка параметров демпинга...</span>
      </div>
    );
  }

  const min = Number(minPrice);
  const max = Number(maxPrice);
  const hasPrices = minPrice.trim() !== '' && maxPrice.trim() !== '' && min > 0 && max > 0;
  const validationError = !hasPrices
    ? 'Укажите минимальную и максимальную цену'
    : min > max
      ? 'Минимальная цена не может быть больше максимальной'
      : '';
  const dirty = toInput(dumping?.minPrice) !== minPrice.trim()
    || toInput(dumping?.maxPrice) !== maxPrice.trim()
    || (dumping?.notes || '') !== notes.trim();
  const connected = Boolean(dumping?.connectedAt);
  const costPrice = Number(product.costPrice);
  const belowCost = hasPrices && costPrice > 0 && min < costPrice;

  const payload = { minPrice: min, maxPrice: max, notes: notes.trim() || null };

  const run = async (action: () => Promise<unknown>, successMessage: string, failMessage: string) => {
    setSaving(true);
    setError('');
    try {
      await action();
      toast.success(successMessage);
      await loadDumping();
      onChanged();
    } catch (actionError) {
      setError(getErrorMessage(actionError, failMessage));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => run(
    () => productsApi.saveProductDumping(product.id, payload),
    'Параметры демпинга сохранены',
    'Не удалось сохранить параметры демпинга'
  );

  const handleConnect = () => run(
    () => productsApi.connectProductDumping(product.id, payload),
    'Демпинг подключён',
    'Не удалось подключить демпинг'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        {showProductHeader ? (
          <div className="min-w-0">
            <p className="text-caption text-text-muted">Товар</p>
            <h3 className="text-section-title text-brand-black">{product.name}</h3>
            <p className="mt-1 text-body text-text-muted">{product.article}</p>
          </div>
        ) : <div />}
        {connected ? (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
            Демпинг подключён
          </Badge>
        ) : (
          <Badge variant="outline">{onStage ? 'Финальный этап' : 'Не подключён'}</Badge>
        )}
      </div>

      {connected && dumping?.connectedAt && (
        <p className="text-caption text-text-muted">
          Проверил{dumping.connector?.name ? `: ${dumping.connector.name}` : ''} ·{' '}
          {new Date(dumping.connectedAt).toLocaleString('ru-RU')}
        </p>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Минимальная цена, ₸"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          disabled={!canEdit}
        />
        <Input
          label="Максимальная цена, ₸"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          disabled={!canEdit}
        />
      </div>

      {belowCost && (
        <Alert variant="warning">
          Минимальная цена ниже себестоимости ({formatPriceKZT(costPrice)}). Сохранить можно, но
          проверьте, что это сделано осознанно.
        </Alert>
      )}
      {canEdit && hasPrices && validationError && <Alert variant="warning">{validationError}</Alert>}

      <Textarea
        label="Примечание"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={!canEdit}
        className="resize-none"
      />

      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {dirty && (
            <Button
              type="button"
              variant="secondary"
              leftIcon={Save}
              loading={saving}
              disabled={saving || Boolean(validationError)}
              onClick={handleSave}
            >
              Сохранить цены
            </Button>
          )}
          {(onStage || !connected) && (
            <Button
              type="button"
              leftIcon={CheckCircle2}
              loading={saving}
              disabled={saving || Boolean(validationError)}
              onClick={handleConnect}
            >
              {onStage ? 'Демпинг подключён и проверен' : 'Отметить: демпинг подключён'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
