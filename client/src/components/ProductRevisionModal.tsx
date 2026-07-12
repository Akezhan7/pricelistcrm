import React, { useState } from 'react';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import { Alert, Button, FileUploadZone, FormField, Textarea } from './ui';

type ProductRevisionModalProps = {
  productId: number;
  productName: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export const ProductRevisionModal: React.FC<ProductRevisionModalProps> = ({
  productId,
  productName,
  onClose,
  onSubmitted,
}) => {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const normalizedComment = comment.trim();
    setError('');

    if (!normalizedComment) {
      setError('Комментарий обязателен');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('comment', normalizedComment);
      files.forEach((file) => data.append('attachments', file));

      await api.post(`/products/${productId}/lifecycle/request-revision`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Карточка отправлена на доработку');
      onSubmitted();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось отправить карточку на доработку';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption text-text-muted">Товар</p>
        <h3 className="text-card-title text-brand-black">{productName}</h3>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Textarea
        label="Комментарий для дизайнера"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={5}
        placeholder="Что нужно исправить в карточке"
        className="resize-none"
      />

      <FormField label="Файл к доработке">
        <FileUploadZone
          selectedFiles={files}
          onFilesChange={setFiles}
          multiple
          accept="image/*,application/pdf,.psd"
          label="Прикрепить файл"
          hint="Изображение, PDF или PSD до 50MB"
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Отмена
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={submitting}
          disabled={submitting || !comment.trim()}
          onClick={handleSubmit}
        >
          Отправить на доработку
        </Button>
      </div>
    </div>
  );
};
