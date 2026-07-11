import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { toast } from '../context/ToastContext';
import productsApi from '../services/productsApi';
import type { ProductLaunchFlags, ProductWorkflowItem } from '../types';
import { Alert, Badge, Button, Spinner, Textarea } from './ui';

type ProductSaleLaunchPanelProps = {
  product: ProductWorkflowItem;
  onChanged: () => void;
};

type FlagField = 'advertisingStarted' | 'promotionStarted' | 'reviewBonusEnabled';

const flagOptions: Array<{ field: FlagField; label: string; description: string }> = [
  { field: 'advertisingStarted', label: 'Реклама запущена', description: 'Рекламное продвижение товара активно' },
  { field: 'promotionStarted', label: 'Акция запущена', description: 'Для товара действует акция' },
  { field: 'reviewBonusEnabled', label: 'Бонус за отзывы', description: 'Подключено вознаграждение за отзывы' },
];

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

export const ProductSaleLaunchPanel: React.FC<ProductSaleLaunchPanelProps> = ({
  product,
  onChanged,
}) => {
  const [flags, setFlags] = useState<ProductLaunchFlags | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = Boolean(product.permissions?.allowedActions.includes('manage_sale_launch'));

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const loadedFlags = await productsApi.getProductLaunchFlags(product.id);
      setFlags(loadedFlags);
      setNotes(loadedFlags.notes || '');
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить параметры продаж'));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const updateFlag = (field: FlagField) => {
    setFlags((current) => current ? { ...current, [field]: !current[field] } : current);
  };

  const handleSave = async () => {
    if (!flags) return;
    setSaving(true);
    setError('');
    const payload = {
      advertisingStarted: flags.advertisingStarted,
      promotionStarted: flags.promotionStarted,
      reviewBonusEnabled: flags.reviewBonusEnabled,
      notes: notes.trim() || undefined,
    };

    try {
      if (flags.completedAt || product.lifecycleCompletedAt) {
        const updatedFlags = await productsApi.updateProductLaunchFlags(product.id, payload);
        setFlags(updatedFlags);
        setNotes(updatedFlags.notes || '');
        toast.success('Параметры продаж обновлены');
      } else {
        await productsApi.completeProductSaleLaunch(product.id, payload);
        toast.success('Запуск продаж завершен');
        onChanged();
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось сохранить параметры продаж'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-text-muted">
        <Spinner size="sm" color="brand" />
        <span className="text-body">Загрузка параметров продаж...</span>
      </div>
    );
  }

  if (!flags) return <Alert variant="error">Данные запуска продаж недоступны.</Alert>;

  const isCompleted = Boolean(flags.completedAt || product.lifecycleCompletedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">Товар</p>
          <h3 className="text-section-title text-brand-black">{product.name}</h3>
          <p className="mt-1 text-body text-text-muted">{product.article}</p>
        </div>
        <Badge variant={isCompleted ? 'success' : 'outline'}>
          {isCompleted ? 'Запуск завершен' : 'Финальный этап'}
        </Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-muted px-3">
        {flagOptions.map((option) => (
          <label key={option.field} className="flex min-h-16 cursor-pointer items-center gap-3 py-3">
            <input
              type="checkbox"
              checked={flags[option.field]}
              onChange={() => updateFlag(option.field)}
              disabled={!canEdit}
              className="h-5 w-5 shrink-0 rounded border-border-input text-brand-yellow focus:ring-brand-yellow/30"
            />
            <span className="min-w-0">
              <span className="block text-body font-medium text-brand-black">{option.label}</span>
              <span className="block text-caption text-text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>

      <Textarea
        label="Примечание"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={!canEdit}
        className="resize-none"
      />

      {!isCompleted && (
        <Alert variant="info">
          Необязательные активности можно оставить выключенными. Завершение подтверждается кнопкой.
        </Alert>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="button"
            leftIcon={isCompleted ? Save : CheckCircle2}
            loading={saving}
            disabled={saving}
            onClick={handleSave}
          >
            {isCompleted ? 'Сохранить изменения' : 'Завершить запуск'}
          </Button>
        </div>
      )}
    </div>
  );
};
