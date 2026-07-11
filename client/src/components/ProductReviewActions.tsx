import React, { useState } from 'react';
import { CheckCircle2, FileUp, RefreshCw, RotateCcw } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import type { ProductWorkflowItem } from '../types';
import { Alert, Button, Input, Modal, Select } from './ui';
import { ProductRevisionHistory } from './ProductRevisionHistory';
import { ProductRevisionModal } from './ProductRevisionModal';

type ProductReviewActionsProps = {
  product: ProductWorkflowItem;
  onChanged: () => void;
  onOpenAssets: () => void;
};

function getErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

export const ProductReviewActions: React.FC<ProductReviewActionsProps> = ({
  product,
  onChanged,
  onOpenAssets,
}) => {
  const [submittingAction, setSubmittingAction] = useState('');
  const [error, setError] = useState('');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);
  const [kpiWeightMode, setKpiWeightMode] = useState('1');
  const [customKpiWeight, setCustomKpiWeight] = useState('');

  const allowedActions = product.permissions?.allowedActions || [];
  const canSubmitReview = allowedActions.includes('submit_review');
  const canReview = allowedActions.includes('approve') || allowedActions.includes('request_revision');
  const canResubmitRevision = allowedActions.includes('resubmit_revision');
  const kpiWeightValue = kpiWeightMode === 'custom' ? Number(customKpiWeight) : Number(kpiWeightMode);
  const kpiWeightValid = Number.isFinite(kpiWeightValue) && kpiWeightValue > 0 && kpiWeightValue <= 99.99;

  const runLifecycleAction = async ({
    action,
    url,
    successMessage,
    fallbackMessage,
    payload,
  }: {
    action: string;
    url: string;
    successMessage: string;
    fallbackMessage: string;
    payload?: Record<string, unknown>;
  }) => {
    setError('');
    setSubmittingAction(action);
    try {
      await api.post(url, payload);
      toast.success(successMessage);
      onChanged();
    } catch (err: unknown) {
      setError(getErrorMessage(err, fallbackMessage));
    } finally {
      setSubmittingAction('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption text-text-muted">Товар</p>
        <h3 className="text-section-title text-brand-black">{product.name}</h3>
        <p className="mt-1 text-body text-text-muted">{product.article}</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-xl border border-border-subtle bg-surface-muted p-3">
        {canSubmitReview && (
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-body-medium text-brand-black">Карточка готова к проверке</h4>
              <p className="text-body text-text-muted">
                Руководитель увидит товар в очереди проверки.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              leftIcon={FileUp}
              loading={submittingAction === 'submit-review'}
              onClick={() =>
                runLifecycleAction({
                  action: 'submit-review',
                  url: `/products/${product.id}/lifecycle/submit-review`,
                  successMessage: 'Карточка передана на проверку',
                  fallbackMessage: 'Не удалось передать карточку на проверку',
                })
              }
            >
              Передать на проверку
            </Button>
          </div>
        )}

        {canReview && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-body-medium text-brand-black">Проверка карточки</h4>
              <p className="text-body text-text-muted">
                Одобрение отправит товар на этап маркетплейсов.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,12rem)]">
              <Select
                label="KPI-вес"
                value={kpiWeightMode}
                onChange={(event) => setKpiWeightMode(event.target.value)}
              >
                <option value="0.5">0.5 · простая</option>
                <option value="1">1 · обычная</option>
                <option value="2">2 · сложная</option>
                <option value="custom">Свой вес</option>
              </Select>
              {kpiWeightMode === 'custom' && (
                <Input
                  label="Свой вес"
                  type="number"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                  value={customKpiWeight}
                  onChange={(event) => setCustomKpiWeight(event.target.value)}
                  error={customKpiWeight && !kpiWeightValid ? 'Введите число от 0.01 до 99.99' : undefined}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                leftIcon={RotateCcw}
                onClick={() => setRevisionModalOpen(true)}
              >
                На доработку
              </Button>
              <Button
                type="button"
                variant="primary"
                leftIcon={CheckCircle2}
                loading={submittingAction === 'approve'}
                disabled={!kpiWeightValid}
                onClick={() =>
                  runLifecycleAction({
                    action: 'approve',
                    url: `/products/${product.id}/lifecycle/approve`,
                    payload: { kpiWeight: kpiWeightValue },
                    successMessage: 'Карточка одобрена',
                    fallbackMessage: 'Не удалось одобрить карточку',
                  })
                }
              >
                Одобрить
              </Button>
            </div>
          </div>
        )}

        {canResubmitRevision && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-body-medium text-brand-black">Доработка карточки</h4>
              <p className="text-body text-text-muted">
                Обновите материалы и отправьте карточку на повторную проверку.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={onOpenAssets}>
                Материалы
              </Button>
              <Button
                type="button"
                variant="primary"
                leftIcon={RefreshCw}
                loading={submittingAction === 'resubmit'}
                onClick={() =>
                  runLifecycleAction({
                    action: 'resubmit',
                    url: `/products/${product.id}/lifecycle/resubmit-revision`,
                    successMessage: 'Карточка отправлена повторно',
                    fallbackMessage: 'Не удалось отправить карточку повторно',
                  })
                }
              >
                Отправить повторно
              </Button>
            </div>
          </div>
        )}

        {!canSubmitReview && !canReview && !canResubmitRevision && (
          <p className="text-body text-text-muted">
            Для вашей роли нет доступного действия на этом этапе.
          </p>
        )}
      </div>

      <ProductRevisionHistory productId={product.id} refreshKey={revisionRefreshKey} />

      <Modal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Отправить на доработку"
        size="lg"
        elevated
      >
        <ProductRevisionModal
          productId={product.id}
          productName={product.name}
          onClose={() => setRevisionModalOpen(false)}
          onSubmitted={() => {
            setRevisionModalOpen(false);
            setRevisionRefreshKey((value) => value + 1);
            onChanged();
          }}
        />
      </Modal>
    </div>
  );
};
