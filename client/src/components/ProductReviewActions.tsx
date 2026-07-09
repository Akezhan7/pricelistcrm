import React, { useState } from 'react';
import { CheckCircle2, FileUp, RefreshCw, RotateCcw } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import type { ProductWorkflowItem } from '../types';
import { Alert, Button, Modal } from './ui';
import { ProductRevisionHistory } from './ProductRevisionHistory';
import { ProductRevisionModal } from './ProductRevisionModal';

type ProductReviewActionsProps = {
  product: ProductWorkflowItem;
  currentUser?: { id?: number; role?: string } | null;
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
  currentUser,
  onChanged,
  onOpenAssets,
}) => {
  const [submittingAction, setSubmittingAction] = useState('');
  const [error, setError] = useState('');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);

  const isAdmin = currentUser?.role === 'admin';
  const isAssignedDesigner =
    currentUser?.role === 'designer' && Number(product.designerId) === Number(currentUser.id);
  const canSubmitReview =
    product.lifecycleStatus === 'content_created' && (isAdmin || isAssignedDesigner);
  const canReview = product.lifecycleStatus === 'review' && isAdmin;
  const canResubmitRevision =
    product.lifecycleStatus === 'revision' && (isAdmin || isAssignedDesigner);

  const runLifecycleAction = async ({
    action,
    url,
    successMessage,
    fallbackMessage,
  }: {
    action: string;
    url: string;
    successMessage: string;
    fallbackMessage: string;
  }) => {
    setError('');
    setSubmittingAction(action);
    try {
      await api.post(url);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex flex-col gap-2 sm:flex-row">
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
                onClick={() =>
                  runLifecycleAction({
                    action: 'approve',
                    url: `/products/${product.id}/lifecycle/approve`,
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
