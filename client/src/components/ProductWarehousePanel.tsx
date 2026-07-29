import React, { useEffect, useState } from 'react';
import { Save, Warehouse } from 'lucide-react';
import { toast } from '../context/ToastContext';
import productsApi from '../services/productsApi';
import type { Product } from '../types';
import { Alert, Badge, Button, Input, Textarea } from './ui';
import { RequirementsChecklist, type RequirementItem } from './RequirementsChecklist';

type ProductWarehousePanelProps = {
  product: Product;
  onChanged: () => void;
};

type FormState = {
  sector: string;
  shelf: string;
  cell: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  costPrice: string;
  notes: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

function formatOptionalValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function getInitialForm(product: Product): FormState {
  return {
    sector: product.warehouseDetails?.sector || '',
    shelf: product.warehouseDetails?.shelf || '',
    cell: product.warehouseDetails?.cell || '',
    weight: formatOptionalValue(product.warehouseDetails?.weight),
    length: formatOptionalValue(product.warehouseDetails?.length),
    width: formatOptionalValue(product.warehouseDetails?.width),
    height: formatOptionalValue(product.warehouseDetails?.height),
    costPrice: String(product.costPrice ?? ''),
    notes: product.warehouseDetails?.notes || '',
  };
}

function optionalNumber(value: string) {
  const normalized = value.trim();
  return normalized === '' ? undefined : Number(normalized);
}

function isOptionalNonNegative(value: string) {
  const normalized = value.trim();
  if (normalized === '') return true;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0;
}

export const ProductWarehousePanel: React.FC<ProductWarehousePanelProps> = ({
  product,
  onChanged,
}) => {
  const [form, setForm] = useState<FormState>(() => getInitialForm(product));
  const [savingLocation, setSavingLocation] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(getInitialForm(product));
    setError('');
  }, [product]);

  const canEditLocation = Boolean(
    product.permissions?.allowedActions.includes('edit_warehouse_location')
  );
  const canCompleteWarehouse = Boolean(
    product.permissions?.allowedActions.includes('manage_warehouse')
  );

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const hasLocation = Boolean(
    form.sector.trim()
    && form.shelf.trim()
    && form.cell.trim()
  );
  const optionalNumbersAreValid = [
    form.weight,
    form.length,
    form.width,
    form.height,
  ].every(isOptionalNonNegative);
  const parsedCostPrice = Number(form.costPrice);
  const hasCostPrice = form.costPrice.trim().length > 0
    && Number.isFinite(parsedCostPrice)
    && parsedCostPrice >= 0;
  const canSaveLocation = canEditLocation && hasLocation && optionalNumbersAreValid;
  const canFinishStage = canCompleteWarehouse && hasLocation && optionalNumbersAreValid && hasCostPrice;

  const warehouseRequirements: RequirementItem[] = [
    {
      label: 'Склад / сектор указан',
      met: form.sector.trim().length > 0,
    },
    {
      label: 'Полка указана',
      met: form.shelf.trim().length > 0,
    },
    {
      label: 'Ячейка указана',
      met: form.cell.trim().length > 0,
    },
    {
      label: 'Себестоимость указана',
      met: hasCostPrice,
    },
  ];

  const getWarehousePayload = () => ({
    sector: form.sector.trim(),
    shelf: form.shelf.trim(),
    cell: form.cell.trim(),
    weight: optionalNumber(form.weight),
    length: optionalNumber(form.length),
    width: optionalNumber(form.width),
    height: optionalNumber(form.height),
    notes: form.notes.trim() || undefined,
  });

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    setError('');
    try {
      await productsApi.updateProductWarehouseDetails(product.id, getWarehousePayload());
      toast.success('Место хранения сохранено');
      onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось сохранить место хранения'));
    } finally {
      setSavingLocation(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError('');
    try {
      await productsApi.completeProductWarehouse(product.id, {
        ...getWarehousePayload(),
        costPrice: optionalNumber(form.costPrice),
      });
      toast.success('Складской этап завершен');
      onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось завершить складской этап'));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">Товар</p>
          <h3 className="text-section-title text-brand-black">{product.name}</h3>
          <p className="mt-1 text-body text-text-muted">Остаток: {product.currentStock || 0} шт.</p>
        </div>
        <Badge variant="outline">Склад</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-muted p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-body font-semibold text-brand-black">Место хранения</h4>
            <p className="mt-1 text-caption text-text-muted">
              Эти поля можно менять без перехода товара по этапам.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Склад / сектор"
            value={form.sector}
            onChange={(event) => updateField('sector', event.target.value)}
            disabled={!canEditLocation}
          />
          <Input
            label="Полка"
            value={form.shelf}
            onChange={(event) => updateField('shelf', event.target.value)}
            disabled={!canEditLocation}
          />
          <Input
            label="Ячейка"
            value={form.cell}
            onChange={(event) => updateField('cell', event.target.value)}
            disabled={!canEditLocation}
          />
        </div>
        {canEditLocation && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              leftIcon={Save}
              loading={savingLocation}
              disabled={savingLocation || !canSaveLocation}
              onClick={handleSaveLocation}
            >
              Сохранить место
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border-subtle bg-brand-white p-3">
        <div>
          <h4 className="text-body font-semibold text-brand-black">Габариты и вес</h4>
          <p className="mt-1 text-caption text-text-muted">
            Необязательные поля. Заполняйте, когда данные уже известны.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input
            label="Вес, кг"
            type="number"
            min="0"
            step="0.001"
            value={form.weight}
            onChange={(event) => updateField('weight', event.target.value)}
            disabled={!canEditLocation}
          />
          <Input
            label="Длина, см"
            type="number"
            min="0"
            step="0.01"
            value={form.length}
            onChange={(event) => updateField('length', event.target.value)}
            disabled={!canEditLocation}
          />
          <Input
            label="Ширина, см"
            type="number"
            min="0"
            step="0.01"
            value={form.width}
            onChange={(event) => updateField('width', event.target.value)}
            disabled={!canEditLocation}
          />
          <Input
            label="Высота, см"
            type="number"
            min="0"
            step="0.01"
            value={form.height}
            onChange={(event) => updateField('height', event.target.value)}
            disabled={!canEditLocation}
          />
        </div>
        <Textarea
          label="Примечание"
          rows={3}
          value={form.notes}
          onChange={(event) => updateField('notes', event.target.value)}
          disabled={!canEditLocation}
          className="resize-none"
        />
      </div>

      {canCompleteWarehouse && (
        <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-muted p-3">
          <Input
            label="Уточненная себестоимость"
            type="number"
            min="0"
            step="0.01"
            value={form.costPrice}
            onChange={(event) => updateField('costPrice', event.target.value)}
            disabled={!canCompleteWarehouse}
            helperText="Изменение будет записано в историю цен"
          />
          <Alert variant="info">
            Эта кнопка завершает складской этап и переводит товар в продажу.
          </Alert>
          <RequirementsChecklist items={warehouseRequirements} />
          <div className="flex justify-end">
            <Button
              type="button"
              leftIcon={Warehouse}
              loading={completing}
              disabled={completing || !canFinishStage}
              onClick={handleComplete}
            >
              Завершить складской этап
            </Button>
          </div>
        </div>
      )}

      {!canEditLocation && !canCompleteWarehouse && (
        <Alert variant="info">У вас нет прав на редактирование складских данных.</Alert>
      )}
    </div>
  );
};
