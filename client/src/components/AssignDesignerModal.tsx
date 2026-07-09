import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FormFooter, Modal, Select } from './ui';
import api from '../utils/api';
import { toast } from '../context/ToastContext';

type DesignerUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

type AssignDesignerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productIds: number[];
  selectedCount: number;
  onSuccess: () => void;
};

export const AssignDesignerModal: React.FC<AssignDesignerModalProps> = ({
  isOpen,
  onClose,
  productIds,
  selectedCount,
  onSuccess,
}) => {
  const [designers, setDesigners] = useState<DesignerUser[]>([]);
  const [designerId, setDesignerId] = useState('');
  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedDesigner = useMemo(
    () => designers.find((designer) => String(designer.id) === designerId) || null,
    [designers, designerId]
  );

  useEffect(() => {
    if (!isOpen) return;

    setDesignerId('');
    setError('');
    loadDesigners();
  }, [isOpen]);

  const loadDesigners = async () => {
    setLoadingDesigners(true);
    try {
      const response = await api.get('/auth/users?role=designer&isActive=true');
      setDesigners(response.data.data.users || []);
    } catch {
      setError('Не удалось загрузить дизайнеров');
    } finally {
      setLoadingDesigners(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');

    if (productIds.length === 0) {
      setError('Выберите товары для передачи дизайнеру');
      return;
    }

    if (!selectedDesigner) {
      setError('Выберите дизайнера');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/products/bulk/assign-designer', {
        productIds,
        designerId: selectedDesigner.id,
      });

      toast.success(`Передано дизайнеру: ${selectedCount}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось передать товары дизайнеру';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Передать дизайнеру"
      size="sm"
      footer={
        <FormFooter
          onCancel={handleClose}
          submitLabel={submitting ? 'Передача...' : 'Передать'}
          submitLoading={submitting}
          submitDisabled={submitting || loadingDesigners || !selectedDesigner || productIds.length === 0}
          onSubmit={handleSubmit}
          submitType="button"
        />
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="rounded-lg border border-border-subtle bg-surface-inset px-3 py-2">
          <p className="text-caption text-text-muted">Выбрано товаров</p>
          <p className="text-section-title text-brand-black tabular-nums">{selectedCount}</p>
        </div>

        <Select
          label="Дизайнер"
          value={designerId}
          onChange={(event) => setDesignerId(event.target.value)}
          disabled={loadingDesigners || submitting}
          required
        >
          <option value="">
            {loadingDesigners ? 'Загрузка дизайнеров...' : 'Выберите дизайнера'}
          </option>
          {designers.map((designer) => (
            <option key={designer.id} value={designer.id}>
              {designer.name}
              {designer.email ? ` - ${designer.email}` : ''}
            </option>
          ))}
        </Select>

        {!loadingDesigners && designers.length === 0 && (
          <Alert variant="warning">
            В системе пока нет активных пользователей с ролью дизайнера.
          </Alert>
        )}
      </div>
    </Modal>
  );
};
