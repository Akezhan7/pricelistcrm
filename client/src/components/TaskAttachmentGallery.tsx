import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { EmployeeTaskAttachment } from '../types';
import tasksApi from '../services/tasksApi';
import { useToast } from '../context/ToastContext';
import { getTaskImageAttachments } from '../utils/taskAttachments';
import { Button, IconButton, Modal, Spinner } from './ui';

interface TaskAttachmentGalleryProps {
  taskId: number;
  attachments: EmployeeTaskAttachment[];
  initialAttachmentId: number;
  onClose: () => void;
}

export const TaskAttachmentGallery: React.FC<TaskAttachmentGalleryProps> = ({
  taskId,
  attachments,
  initialAttachmentId,
  onClose,
}) => {
  const toast = useToast();
  const images = useMemo(() => getTaskImageAttachments(attachments), [attachments]);
  const initialIndex = Math.max(images.findIndex((item) => item.id === initialAttachmentId), 0);
  const [index, setIndex] = useState(initialIndex);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeImage = images[index] || null;

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!activeImage) return undefined;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError('');
    setPreviewUrl(null);

    tasksApi.getAttachmentBlob(taskId, activeImage.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить изображение');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeImage, taskId]);

  const showPrevious = () => {
    setIndex((current) => current === 0 ? images.length - 1 : current - 1);
  };

  const showNext = () => {
    setIndex((current) => current === images.length - 1 ? 0 : current + 1);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <Modal
      isOpen={Boolean(activeImage)}
      onClose={onClose}
      title={activeImage?.originalName || 'Изображение'}
      size="xl"
      elevated
    >
      {activeImage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-caption text-text-muted">
            <span>{index + 1} из {images.length}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={Download}
              onClick={() => tasksApi.downloadAttachment(taskId, activeImage).catch(() => {
                toast.error('Не удалось скачать изображение');
              })}
            >
              Скачать оригинал
            </Button>
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <IconButton
              icon={ChevronLeft}
              title="Предыдущее изображение"
              size="md"
              variant="default"
              onClick={showPrevious}
              disabled={images.length <= 1}
            />
            <div className="flex min-h-[18rem] items-center justify-center rounded-lg bg-surface-inset p-2 sm:min-h-[28rem]">
              {loading && <Spinner size="lg" color="brand" />}
              {!loading && error && <p className="text-body text-danger-dark">{error}</p>}
              {!loading && previewUrl && (
                <img
                  src={previewUrl}
                  alt={activeImage.originalName}
                  className="max-h-[65vh] max-w-full object-contain"
                />
              )}
            </div>
            <IconButton
              icon={ChevronRight}
              title="Следующее изображение"
              size="md"
              variant="default"
              onClick={showNext}
              disabled={images.length <= 1}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};
