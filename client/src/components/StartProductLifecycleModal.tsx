import React, { useEffect, useMemo, useState } from 'react';
import { Rocket } from 'lucide-react';
import type { Product, ProductLifecycleStatus } from '../types';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import { Alert, Button, Modal, Select, Spinner } from './ui';

type WorkflowUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

type StartStatusOption = {
  value: ProductLifecycleStatus;
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

const startStatusOptions: StartStatusOption[] = [
  {
    value: 'new',
    label: 'Новые товары',
    description: 'Товар появится в пуле новых товаров, затем его можно будет назначить дизайнеру.',
  },
  {
    value: 'assigned_to_designer',
    label: 'Сразу дизайнеру',
    description: 'Товар сразу попадёт в очередь выбранного дизайнера.',
  },
  {
    value: 'marketplace',
    label: 'Сразу на маркетплейс',
    description: 'Товар попадёт в очередь размещения Kaspi без этапов дизайна и проверки.',
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
  const [targetStatus, setTargetStatus] = useState<ProductLifecycleStatus>('new');
  const [designerId, setDesignerId] = useState('');
  const [users, setUsers] = useState<WorkflowUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const designers = useMemo(
    () => users.filter((user) => user.role === 'designer'),
    [users]
  );
  const selectedOption = startStatusOptions.find((option) => option.value === targetStatus);
  const requiresDesigner = targetStatus === 'assigned_to_designer';
  const isBulk = productIds.length > 0;
  const canSubmit = Boolean(
    (product || isBulk) && (!requiresDesigner || designerId)
  );

  useEffect(() => {
    if (!isOpen) return;
    setTargetStatus('new');
    setDesignerId('');
    setError('');
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingUsers(true);
    api.get('/auth/users?isActive=true')
      .then((response) => {
        setUsers(response.data.data.users || []);
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => {
        setLoadingUsers(false);
      });
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!product && !isBulk) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        targetStatus,
        designerId: requiresDesigner ? Number(designerId) : null,
      };

      if (isBulk) {
        await api.post('/products/lifecycle/bulk-start', {
          ...payload,
          productIds,
        });
        toast.success(`Запущено в lifecycle: ${selectedCount}`);
      } else if (product) {
        await api.post(`/products/${product.id}/lifecycle/start`, payload);
        toast.success('Товар запущен в lifecycle');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(
        err,
        isBulk
          ? 'Не удалось запустить lifecycle выбранных товаров'
          : 'Не удалось запустить lifecycle товара'
      ));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBulk ? 'Массовый запуск lifecycle' : 'Запустить lifecycle'}
      size="md"
    >
      <div className="space-y-4">
        {product && (
          <div className="rounded-lg border border-border-subtle bg-surface-muted p-3">
            <p className="text-caption text-text-muted">Товар</p>
            <p className="text-card-title text-brand-black">{product.name}</p>
            <p className="mt-1 text-caption text-text-muted">{product.article}</p>
          </div>
        )}

        {isBulk && (
          <div className="rounded-lg border border-border-subtle bg-surface-muted p-3">
            <p className="text-caption text-text-muted">Выбрано товаров</p>
            <p className="text-section-title text-brand-black tabular-nums">
              {selectedCount}
            </p>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <Select
          label="С какого этапа начать"
          value={targetStatus}
          onChange={(event) => setTargetStatus(event.target.value as ProductLifecycleStatus)}
        >
          {startStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        {selectedOption && (
          <Alert variant="info">{selectedOption.description}</Alert>
        )}

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
