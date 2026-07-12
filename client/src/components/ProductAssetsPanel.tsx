import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Send, Trash2 } from 'lucide-react';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import type { ProductAsset, ProductAssetType } from '../types';
import {
  Alert,
  Badge,
  Button,
  FileUploadZone,
  FormField,
  IconButton,
  Select,
  Spinner,
  Textarea,
} from './ui';
import { toast } from '../context/ToastContext';

type ProductAssetsPanelProps = {
  productId: number;
  productName: string;
  canEdit: boolean;
  canSubmitContent: boolean;
  onContentSubmitted: () => void;
  showProductHeader?: boolean;
  onAssetsChanged?: (assets: ProductAsset[]) => void;
};

const assetTypeOptions: Array<{
  value: ProductAssetType;
  label: string;
  accept: string;
  hint: string;
}> = [
  {
    value: 'product_photo',
    label: 'Фото товара',
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    hint: 'JPG, PNG, GIF, WebP до 10MB',
  },
  {
    value: 'slide_jpg',
    label: 'JPG-слайд',
    accept: 'image/jpeg',
    hint: 'Только JPG/JPEG до 20MB',
  },
  {
    value: 'psd_source',
    label: 'PSD-исходник',
    accept: '.psd,application/octet-stream,image/vnd.adobe.photoshop',
    hint: 'PSD до 200MB',
  },
  {
    value: 'other',
    label: 'Другой файл',
    accept: 'image/*,application/pdf,.zip,.psd',
    hint: 'Изображение, PDF, ZIP или PSD',
  },
];

const assetTypeLabels: Record<ProductAssetType, string> = {
  product_photo: 'Фото товара',
  slide_jpg: 'JPG-слайды',
  psd_source: 'PSD',
  revision_attachment: 'Доработки',
  patent_file: 'Казпатент',
  other: 'Другие файлы',
};

function formatFileSize(size?: number | null) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageAsset(asset: ProductAsset) {
  return Boolean(asset.mimeType?.startsWith('image/'));
}

export const ProductAssetsPanel: React.FC<ProductAssetsPanelProps> = ({
  productId,
  productName,
  canEdit,
  canSubmitContent,
  onContentSubmitted,
  showProductHeader = true,
  onAssetsChanged,
}) => {
  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [assetType, setAssetType] = useState<ProductAssetType>('product_photo');
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submittingContent, setSubmittingContent] = useState(false);
  const [error, setError] = useState('');
  const onAssetsChangedRef = useRef(onAssetsChanged);

  useEffect(() => {
    onAssetsChangedRef.current = onAssetsChanged;
  }, [onAssetsChanged]);

  const selectedAssetType = useMemo(
    () => assetTypeOptions.find((option) => option.value === assetType) || assetTypeOptions[0],
    [assetType]
  );

  const groupedAssets = useMemo(() => {
    const groups = new Map<ProductAssetType, ProductAsset[]>();
    assets.forEach((asset) => {
      const current = groups.get(asset.assetType) || [];
      current.push(asset);
      groups.set(asset.assetType, current);
    });
    return Array.from(groups.entries());
  }, [assets]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${productId}/assets`);
      const loadedAssets = response.data.data.assets || [];
      setAssets(loadedAssets);
      onAssetsChangedRef.current?.(loadedAssets);
      setError('');
    } catch {
      setError('Не удалось загрузить материалы товара');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleUpload = async () => {
    setError('');

    if (files.length === 0) {
      setError('Выберите файл');
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.allSettled(
        files.map((selectedFile) => {
          const data = new FormData();
          data.append('assetType', assetType);
          data.append('asset', selectedFile);
          if (notes.trim()) data.append('notes', notes.trim());

          return api.post(`/products/${productId}/assets`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })
      );

      const failedFiles = files.filter((_, index) => results[index].status === 'rejected');
      const successCount = files.length - failedFiles.length;

      if (successCount > 0) {
        toast.success(
          successCount === 1 ? 'Материал загружен' : `Загружено файлов: ${successCount}`
        );
      }

      setFiles(failedFiles);
      if (failedFiles.length === 0) {
        setNotes('');
      } else {
        setError(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р»РѕРІ: ${failedFiles.length}`);
      }
      await loadAssets();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось загрузить материал';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId: number) => {
    setError('');
    try {
      await api.delete(`/products/${productId}/assets/${assetId}`);
      toast.success('Материал удален');
      await loadAssets();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось удалить материал';
      setError(message);
    }
  };

  const handleSubmitContent = async () => {
    setError('');
    setSubmittingContent(true);
    try {
      await api.post(`/products/${productId}/lifecycle/submit-content`);
      toast.success('Карточка отмечена как созданная');
      onContentSubmitted();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось завершить карточку';
      setError(message);
    } finally {
      setSubmittingContent(false);
    }
  };

  return (
    <div className="space-y-4">
      {showProductHeader && (
        <div>
          <p className="text-caption text-text-muted">Товар</p>
          <h3 className="text-section-title text-brand-black">{productName}</h3>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {canEdit && (
        <div className="rounded-xl border border-border-subtle bg-surface-muted p-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Тип материала"
              value={assetType}
              onChange={(event) => {
                setAssetType(event.target.value as ProductAssetType);
                setFiles([]);
              }}
            >
              {assetTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Textarea
              label="Комментарий"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Что важно по этому файлу"
              className="resize-none"
            />
          </div>

          <FormField label="Файл">
            <FileUploadZone
              selectedFiles={files}
              onFilesChange={setFiles}
              multiple
              accept={selectedAssetType.accept}
              label="Выбрать файл"
              hint={selectedAssetType.hint}
            />
          </FormField>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              loading={uploading}
              disabled={uploading || files.length === 0}
              onClick={handleUpload}
            >
              Загрузить
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-subtle bg-brand-white overflow-hidden">
        <div className="border-b border-border-subtle px-3 py-2.5 flex items-center justify-between gap-2">
          <h4 className="text-body-medium text-brand-black">Материалы</h4>
          <Badge variant="outline">{assets.length}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-text-muted">
            <Spinner size="sm" color="brand" />
            <span className="text-body">Загрузка...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-6 text-center text-body text-text-muted">
            Материалы пока не загружены.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {groupedAssets.map(([type, items]) => (
              <section key={type} className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">{assetTypeLabels[type]}</Badge>
                  <span className="text-caption text-text-muted">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((asset) => {
                    const assetUrl = getImageUrl(asset.filePath) || asset.filePath;
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-inset p-2"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-white border border-border-subtle">
                          {isImageAsset(asset) ? (
                            <img
                              src={assetUrl}
                              alt={asset.originalName || 'Материал'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="h-5 w-5 text-text-muted" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-medium text-brand-black">
                            {asset.originalName || asset.filePath}
                          </p>
                          <p className="text-caption text-text-muted">
                            {formatFileSize(asset.fileSize)}
                            {asset.uploader?.name ? ` · ${asset.uploader.name}` : ''}
                          </p>
                          {asset.notes && (
                            <p className="mt-0.5 line-clamp-2 text-caption text-text-muted">
                              {asset.notes}
                            </p>
                          )}
                        </div>
                        <a
                          href={assetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-brand-white hover:text-brand-black"
                          title="Открыть файл"
                        >
                          {isImageAsset(asset) ? (
                            <ImageIcon className="h-4 w-4" aria-hidden />
                          ) : (
                            <Download className="h-4 w-4" aria-hidden />
                          )}
                        </a>
                        {canEdit && (
                          <IconButton
                            icon={Trash2}
                            title="Удалить материал"
                            size="md"
                            variant="danger"
                            onClick={() => handleDelete(asset.id)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {canSubmitContent && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            leftIcon={Send}
            loading={submittingContent}
            disabled={submittingContent || assets.length === 0}
            onClick={handleSubmitContent}
          >
            Карточка создана
          </Button>
        </div>
      )}
    </div>
  );
};
