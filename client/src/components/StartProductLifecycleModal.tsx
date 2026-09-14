import React, { useEffect, useMemo, useState } from 'react';
import { Rocket } from 'lucide-react';
import type { Product, ProductLifecycleRouteStage } from '../types';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import { Alert, Button, Modal, Select, Spinner, Textarea } from './ui';

type WorkflowUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

type RouteStageOption = {
  value: ProductLifecycleRouteStage;
  label: string;
  description: string;
};

type StartProductLifecycleModalProps = {
  isOpen: boolean;
  product: Product | null;
  productIds?: number[];
  selectedCount?: number;
  onClose: () => void;
  onSuccess: () => void;
};

const routeStageOptions: RouteStageOption[] = [
  {
    value: 'design',
    label: 'Материалы и дизайн',
    description: 'Работа дизайнера и обязательная проверка материалов.',
  },
  {
    value: 'marketplace',
    label: 'Маркетплейс',
    description: 'Размещение или обновление карточки на площадке.',
  },
  {
    value: 'purchase',
    label: 'Закуп',
    description: 'Оформление через закупочный лист и последующая приёмка.',
  },
  {
    value: 'warehouse',
    label: 'Склад',
    description: 'Проверка и заполнение складского размещения.',
  },
  {
    value: 'sale_launch',
    label: 'Запуск продаж и реклама',
    description: 'Настройка рекламных активностей и параметров продаж.',
  },
];

const routePresets: Array<{
  label: string;
  stages: ProductLifecycleRouteStage[];
}> = [
  { label: 'Материалы', stages: ['design'] },
  { label: 'Материалы + площадка', stages: ['design', 'marketplace'] },
  {
    label: 'Полный цикл',
    stages: ['design', 'marketplace', 'purchase', 'warehouse', 'sale_launch'],
  },
];

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

export const StartProductLifecycleModal: React.FC<StartProductLifecycleModalProps> = ({
  isOpen,
  product,
  productIds = [],
  selectedCount = 0,
  onClose,
  onSuccess,
}) => {
  const [stages, setStages] = useState<ProductLifecycleRouteStage[]>(['design']);
  const [designerId, setDesignerId] = useState('');
  const [reason, setReason] = useState('');
  const [users, setUsers] = useState<WorkflowUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const designers = useMemo(
    () => users.filter((user) => user.role === 'designer'),
    [users]
  );
  const requiresDesigner = stages.includes('design');
  const isBulk = productIds.length > 0;
  const requiresReason = isBulk || Boolean(product?.lifecycleStartedAt);
  const canSubmit = Boolean(
    (product || isBulk)
      && stages.length > 0
      && (!requiresDesigner || designerId)
      && (!requiresReason || reason.trim())
  );

  useEffect(() => {
    if (!isOpen) return;
    setStages(['design']);
    setDesignerId('');
    setReason('');
    setError('');
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingUsers(true);
    api.get('/auth/users?isActive=true')
      .then((response) => setUsers(response.data.data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [isOpen]);

  const toggleStage = (stage: ProductLifecycleRouteStage) => {
    setStages((current) => {
      if (stage === 'warehouse' && current.includes('purchase')) return current;

      const selected = new Set(current);
      if (selected.has(stage)) selected.delete(stage);
      else selected.add(stage);
      if (stage === 'purchase' && selected.has('purchase')) selected.add('warehouse');

      return routeStageOptions
        .map((option) => option.value)
        .filter((value) => selected.has(value));
    });
  };

  const handleSubmit = async () => {
    if (!product && !isBulk) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        stages,
        designerId: requiresDesigner ? Number(designerId) : null,
        reason: reason.trim() || null,
      };

      if (isBulk) {
        await api.post('/products/lifecycle/bulk-start', { ...payload, productIds });
        toast.success(`Запущено в цикл: ${selectedCount}`);
      } else if (product) {
        await api.post(`/products/${product.id}/lifecycle/start`, payload);
        toast.success(
          product.lifecycleStartedAt ? 'Новый цикл товара запущен' : 'Цикл товара запущен'
        );
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(
        err,
        isBulk
          ? 'Не удалось запустить цикл выбранных товаров'
          : 'Не удалось запустить цикл товара'
      ));
    } finally {
      setSaving(false);
    }
  };

  const selectedRouteLabel = routeStageOptions
    .filter((option) => stages.includes(option.value))
    .map((option) => option.label)
    .join(' → ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBulk
        ? 'Массовый запуск цикла'
        : product?.lifecycleStartedAt ? 'Запустить новый цикл' : 'Запустить цикл'}
      size="lg"
    >
      <div className="space-y-4">
        {product && (
          <div className="border-b border-border-subtle pb-3">
            <p className="text-caption text-text-muted">Товар</p>
            <p className="text-card-title text-brand-black">{product.name}</p>
            <p className="mt-1 text-caption text-text-muted">{product.article}</p>
          </div>
        )}

        {isBulk && (
          <div className="border-b border-border-subtle pb-3">
            <p className="text-caption text-text-muted">Выбрано товаров</p>
            <p className="text-section-title text-brand-black tabular-nums">{selectedCount}</p>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <p className="mb-2 text-body-medium text-brand-black">Быстрый маршрут</p>
          <div className="flex flex-wrap gap-2">
            {routePresets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStages(preset.stages)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-body-medium text-brand-black">Этапы цикла</legend>
          <div className="divide-y divide-border-subtle border-y border-border-subtle">
            {routeStageOptions.map((option) => {
              const checked = stages.includes(option.value);
              const lockedByPurchase = option.value === 'warehouse' && stages.includes('purchase');
              return (
                <label key={option.value} className="flex min-h-16 cursor-pointer items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={lockedByPurchase}
                    onChange={() => toggleStage(option.value)}
                    className="h-5 w-5 shrink-0 rounded border-border-input text-brand-yellow focus:ring-brand-yellow/30"
                  />
                  <span className="min-w-0">
                    <span className="block text-body-medium text-brand-black">{option.label}</span>
                    <span className="block text-caption text-text-muted">
                      {lockedByPurchase ? 'Обязательный этап после закупа.' : option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {stages.length === 0 && <Alert variant="warning">Выберите хотя бы один этап.</Alert>}

        {requiresDesigner && (
          loadingUsers ? (
            <div className="flex items-center gap-2 text-body text-text-muted">
              <Spinner size="sm" color="brand" />
              <span>Загрузка дизайнеров...</span>
            </div>
          ) : (
            <Select
              label="Дизайнер"
              value={designerId}
              onChange={(event) => setDesignerId(event.target.value)}
            >
              <option value="">Выберите дизайнера</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>
                  {designer.email ? `${designer.name} · ${designer.email}` : designer.name}
                </option>
              ))}
            </Select>
          )
        )}

        {requiresReason && (
          <Textarea
            label="Причина запуска"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Например, добавить недостающие материалы"
            required
          />
        )}

        {selectedRouteLabel && <Alert variant="info">Маршрут: {selectedRouteLabel}</Alert>}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={Rocket}
            loading={saving}
            disabled={saving || !canSubmit}
            onClick={handleSubmit}
          >
            Запустить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
