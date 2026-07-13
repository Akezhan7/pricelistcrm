import React, { useEffect, useState } from 'react';
import { Warehouse } from 'lucide-react';
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

function getInitialForm(product: Product): FormState {
  return {
    sector: product.warehouseDetails?.sector || '',
    shelf: product.warehouseDetails?.shelf || '',
    cell: product.warehouseDetails?.cell || '',
    weight: product.warehouseDetails ? String(product.warehouseDetails.weight) : '',
    length: product.warehouseDetails ? String(product.warehouseDetails.length) : '',
    width: product.warehouseDetails ? String(product.warehouseDetails.width) : '',
    height: product.warehouseDetails ? String(product.warehouseDetails.height) : '',
    costPrice: String(product.costPrice ?? ''),
    notes: product.warehouseDetails?.notes || '',
  };
}

export const ProductWarehousePanel: React.FC<ProductWarehousePanelProps> = ({
  product,
  onChanged,
}) => {
  const [form, setForm] = useState<FormState>(() => getInitialForm(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(getInitialForm(product));
    setError('');
  }, [product]);

  const canEdit = Boolean(product.permissions?.allowedActions.includes('manage_warehouse'));
  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const isComplete = Boolean(
    form.sector.trim()
    && form.shelf.trim()
    && form.cell.trim()
    && Number(form.weight) > 0
    && Number(form.length) > 0
    && Number(form.width) > 0
    && Number(form.height) > 0
    && Number(form.costPrice) >= 0
  );
  const warehouseRequirements: RequirementItem[] = [
    {
      label: 'Сектор указан',
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
      label: 'Вес больше 0',
      met: Number(form.weight) > 0,
    },
    {
      label: 'Габариты заполнены',
      met: Number(form.length) > 0 && Number(form.width) > 0 && Number(form.height) > 0,
    },
    {
      label: 'Себестоимость указана',
      met: Number(form.costPrice) >= 0 && form.costPrice.trim().length > 0,
    },
  ];

  const handleComplete = async () => {
    setSaving(true);
    setError('');
    try {
      await productsApi.completeProductWarehouse(product.id, {
        sector: form.sector.trim(),
        shelf: form.shelf.trim(),
        cell: form.cell.trim(),
        weight: Number(form.weight),
        length: Number(form.length),
        width: Number(form.width),
        height: Number(form.height),
        costPrice: Number(form.costPrice),
        notes: form.notes.trim() || undefined,
      });
      toast.success('Складской паспорт сохранен');
      onChanged();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось завершить складской этап'));
    } finally {
      setSaving(false);
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
        <Badge variant="outline">Складской паспорт</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Сектор" value={form.sector} onChange={(event) => updateField('sector', event.target.value)} disabled={!canEdit} />
          <Input label="Полка" value={form.shelf} onChange={(event) => updateField('shelf', event.target.value)} disabled={!canEdit} />
          <Input label="Ячейка" value={form.cell} onChange={(event) => updateField('cell', event.target.value)} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Вес, кг" type="number" min="0.001" step="0.001" value={form.weight} onChange={(event) => updateField('weight', event.target.value)} disabled={!canEdit} />
          <Input label="Длина, см" type="number" min="0.01" step="0.01" value={form.length} onChange={(event) => updateField('length', event.target.value)} disabled={!canEdit} />
          <Input label="Ширина, см" type="number" min="0.01" step="0.01" value={form.width} onChange={(event) => updateField('width', event.target.value)} disabled={!canEdit} />
          <Input label="Высота, см" type="number" min="0.01" step="0.01" value={form.height} onChange={(event) => updateField('height', event.target.value)} disabled={!canEdit} />
        </div>
        <Input
          label="Уточненная себестоимость"
          type="number"
          min="0"
          step="0.01"
          value={form.costPrice}
          onChange={(event) => updateField('costPrice', event.target.value)}
          disabled={!canEdit}
          helperText="Изменение будет записано в историю цен"
        />
        <Textarea label="Примечание" rows={3} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} disabled={!canEdit} className="resize-none" />
      </div>
      <Alert variant="info">После сохранения товар перейдет в статус «В продаже».</Alert>
      <RequirementsChecklist items={warehouseRequirements} />
      {canEdit && (
        <div className="flex justify-end">
          <Button type="button" leftIcon={Warehouse} loading={saving} disabled={saving || !isComplete} onClick={handleComplete}>
            Завершить складской этап
          </Button>
        </div>
      )}
    </div>
  );
};
