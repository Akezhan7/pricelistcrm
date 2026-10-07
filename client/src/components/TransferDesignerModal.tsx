import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FormFooter, Modal, Select, Textarea } from './ui';
import api from '../utils/api';
import { toast } from '../context/ToastContext';

type DesignerUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

type TransferDesignerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productIds: number[];
  /** Дизайнер, которому карточки уже принадлежат (его в списке не показываем). */
  excludeDesignerId?: number | null;
  onSuccess: () => void;
};

export const TransferDesignerModal: React.FC<TransferDesignerModalProps> = ({
  isOpen,
  onClose,
  productIds,
  excludeDesignerId = null,
  onSuccess,
}) => {
  const [designers, setDesigners] = useState<DesignerUser[]>([]);
  const [designerId, setDesignerId] = useState('');
  const [comment, setComment] = useState('');
  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableDesigners = useMemo(
    () => designers.filter((designer) => designer.id !== excludeDesignerId),
    [designers, excludeDesignerId]
  );
  const selectedDesigner = useMemo(
    () => availableDesigners.find((designer) => String(designer.id) === designerId) || null,
    [availableDesigners, designerId]
  );

  useEffect(() => {
    if (!isOpen) return;

    setDesignerId('');
    setComment('');
    setError('');

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

    loadDesigners();
  }, [isOpen]);

  const handleClose = () => {
    if (submitting) return;
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');

    if (!selectedDesigner) {
      setError('Выберите дизайнера');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/products/bulk/transfer-designer', {
        productIds,
        designerId: selectedDesigner.id,
        comment: comment.trim() || null,
      });

      toast.success(`Передано дизайнеру ${selectedDesigner.name}: ${productIds.length}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось передать карточки';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Передать другому дизайнеру"
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
          <p className="text-caption text-text-muted">Карточек к передаче</p>
          <p className="text-section-title text-brand-black tabular-nums">{productIds.length}</p>
        </div>

        <Select
          label="Кому передать"
          value={designerId}
          onChange={(event) => setDesignerId(event.target.value)}
          disabled={loadingDesigners || submitting}
          required
        >
          <option value="">
            {loadingDesigners ? 'Загрузка дизайнеров...' : 'Выберите дизайнера'}
          </option>
          {availableDesigners.map((designer) => (
            <option key={designer.id} value={designer.id}>
              {designer.name}
            </option>
          ))}
        </Select>

        {!loadingDesigners && availableDesigners.length === 0 && (
          <Alert variant="warning">Нет других активных дизайнеров, которым можно передать карточки.</Alert>
        )}

        <Textarea
          label="Комментарий (необязательно)"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={submitting}
          placeholder="Что уже сделано, на что обратить внимание"
          className="resize-none"
        />
      </div>
    </Modal>
  );
};
