import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Image as ImageIcon, Send, Trash2 } from 'lucide-react';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import {
  buildProductAssetUploadConfig,
  buildChunkUploadProgress,
  calculateProductAssetUploadProgress,
  getDisplayAssetName,
  getGalleryImageAssets,
  getProductAssetPreviewPath,
  getProductAssetThumbnailPath,
  isPreviewableImageAsset,
  recommendAssetTypeForFiles,
  shouldUseChunkedUpload,
} from '../utils/productAssets';
import type { ProductAsset, ProductAssetType } from '../types';
import {
  Alert,
  Badge,
  Button,
  FileUploadZone,
  FormField,
  IconButton,
  Modal,
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
  const [uploadProgress, setUploadProgress] = useState<{
    fileName: string;
    loaded: number;
    total: number;
    percent: number;
  } | null>(null);
  const [submittingContent, setSubmittingContent] = useState(false);
  const [error, setError] = useState('');
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const onAssetsChangedRef = useRef(onAssetsChanged);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onAssetsChangedRef.current = onAssetsChanged;
  }, [onAssetsChanged]);

  useEffect(() => () => {
    uploadAbortControllerRef.current?.abort();
  }, []);

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

  const galleryAssets = useMemo(() => getGalleryImageAssets(assets), [assets]);
  const activeGalleryAsset = galleryIndex === null ? null : galleryAssets[galleryIndex] || null;

  const closeGallery = () => setGalleryIndex(null);

  const openGallery = (asset: ProductAsset) => {
    const index = galleryAssets.findIndex((item) => item.id === asset.id);
    if (index >= 0) setGalleryIndex(index);
  };

  const showPreviousGalleryAsset = () => {
    if (galleryAssets.length === 0) return;
    setGalleryIndex((current) => {
      const index = current ?? 0;
      return index === 0 ? galleryAssets.length - 1 : index - 1;
    });
  };

  const showNextGalleryAsset = () => {
    if (galleryAssets.length === 0) return;
    setGalleryIndex((current) => {
      const index = current ?? 0;
      return index === galleryAssets.length - 1 ? 0 : index + 1;
    });
  };

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
    const abortController = new AbortController();
    uploadAbortControllerRef.current = abortController;
    try {
      const failedFiles: File[] = [];
      const failedMessages: string[] = [];

      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const selectedFile = files[fileIndex];
        const selectedType = recommendAssetTypeForFiles([selectedFile], assetType);
        let uploadId: string | null = null;

        try {
          setUploadProgress({
            fileName: selectedFile.name,
            loaded: 0,
            total: selectedFile.size,
            percent: 0,
          });
          if (shouldUseChunkedUpload(selectedFile.size)) {
            const sessionResponse = await api.post(
              `/products/${productId}/assets/upload-sessions`,
              {
                assetType: selectedType,
                originalName: selectedFile.name,
                mimeType: selectedFile.type || 'application/octet-stream',
                fileSize: selectedFile.size,
                notes: notes.trim() || null,
              },
              { signal: abortController.signal }
            );
            const session = sessionResponse.data.data as {
              uploadId: string;
              chunkSize: number;
              totalChunks: number;
            };
            uploadId = session.uploadId;

            for (let chunkIndex = 0; chunkIndex < session.totalChunks; chunkIndex += 1) {
              const chunkStart = chunkIndex * session.chunkSize;
              const chunk = selectedFile.slice(
                chunkStart,
                Math.min(chunkStart + session.chunkSize, selectedFile.size)
              );
              let lastError: unknown = null;

              for (let attempt = 0; attempt < 3; attempt += 1) {
                const chunkData = new FormData();
                chunkData.append('chunk', chunk, selectedFile.name);
                try {
                  await api.put(
                    `/products/${productId}/assets/upload-sessions/${session.uploadId}/chunks/${chunkIndex}`,
                    chunkData,
                    {
                      ...buildProductAssetUploadConfig(),
                      headers: { 'Content-Type': 'multipart/form-data' },
                      signal: abortController.signal,
                      onUploadProgress: (event) => {
                        setUploadProgress({
                          fileName: selectedFile.name,
                          ...buildChunkUploadProgress(chunkStart, event.loaded, selectedFile.size),
                        });
                      },
                    }
                  );
                  lastError = null;
                  break;
                } catch (chunkError) {
                  lastError = chunkError;
                  if ((chunkError as { code?: string })?.code === 'ERR_CANCELED') throw chunkError;
                }
              }

              if (lastError) throw lastError;
              setUploadProgress({
                fileName: selectedFile.name,
                ...buildChunkUploadProgress(chunkStart, chunk.size, selectedFile.size),
              });
            }

            await api.post(
              `/products/${productId}/assets/upload-sessions/${session.uploadId}/complete`,
              undefined,
              { ...buildProductAssetUploadConfig(), signal: abortController.signal }
            );
            uploadId = null;
          } else {
            const data = new FormData();
            data.append('assetType', selectedType);
            data.append('asset', selectedFile);
            if (notes.trim()) data.append('notes', notes.trim());

            await api.post(`/products/${productId}/assets`, data, {
              ...buildProductAssetUploadConfig(),
              headers: { 'Content-Type': 'multipart/form-data' },
              signal: abortController.signal,
              onUploadProgress: (event) => {
                setUploadProgress({
                  fileName: selectedFile.name,
                  ...calculateProductAssetUploadProgress(
                    event.loaded,
                    event.total,
                    selectedFile.size
                  ),
                });
              },
            });
          }
        } catch (err: unknown) {
          if (uploadId) {
            try {
              await api.delete(`/products/${productId}/assets/upload-sessions/${uploadId}`);
            } catch {
              // Expired upload sessions are also cleaned automatically by the server.
            }
          }
          const isCancelled = (err as { code?: string })?.code === 'ERR_CANCELED';

          if (isCancelled) {
            failedFiles.push(...files.slice(fileIndex));
            failedMessages.push('Загрузка отменена');
            break;
          }

          failedFiles.push(selectedFile);
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (err as Error)?.message ||
            'ошибка загрузки';
          failedMessages.push(`${selectedFile.name}: ${message}`);
        }
      }

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
        setError(failedMessages.length > 0 ? failedMessages.join('\n') : `Не удалось загрузить файлов: ${failedFiles.length}`);
      }
      await loadAssets();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось загрузить материал';
      setError(message);
    } finally {
      uploadAbortControllerRef.current = null;
      setUploadProgress(null);
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    uploadAbortControllerRef.current?.abort();
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
              onFilesChange={(selectedFiles) => {
                setFiles(selectedFiles);
                setAssetType((currentType) => recommendAssetTypeForFiles(selectedFiles, currentType));
              }}
              multiple
              accept={selectedAssetType.accept}
              label="Выбрать файл"
              hint={selectedAssetType.hint}
            />
          </FormField>

          {uploadProgress && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-caption text-text-muted">
                <span className="min-w-0 truncate">{uploadProgress.fileName}</span>
                <span className="shrink-0 tabular-nums">
                  {formatFileSize(uploadProgress.loaded) || '0 KB'} / {formatFileSize(uploadProgress.total)} · {uploadProgress.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border-subtle">
                <div
                  className="h-full bg-brand-yellow transition-[width] duration-200"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {uploading && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelUpload}
              >
                Отменить
              </Button>
            )}
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
                    const thumbnailPath = getProductAssetThumbnailPath(asset);
                    const thumbnailUrl = getImageUrl(thumbnailPath) || thumbnailPath;
                    const assetName = getDisplayAssetName(asset);
                    const canPreview = isPreviewableImageAsset(asset);
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-inset p-2"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-white border border-border-subtle">
                          {canPreview ? (
                            <button
                              type="button"
                              className="h-full w-full"
                              onClick={() => openGallery(asset)}
                              title="Открыть галерею"
                            >
                              <img
                                src={thumbnailUrl}
                                alt={assetName || 'Материал'}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </button>
                          ) : (
                            <FileText className="h-5 w-5 text-text-muted" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-medium text-brand-black">
                            {assetName || asset.filePath}
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
                          {canPreview ? (
                            <Eye className="h-4 w-4" aria-hidden />
                          ) : (
                            <Download className="h-4 w-4" aria-hidden />
                          )}
                        </a>
                        {canPreview && (
                          <IconButton
                            icon={ImageIcon}
                            title="Листать слайды"
                            size="md"
                            variant="ghost"
                            onClick={() => openGallery(asset)}
                          />
                        )}
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

      <Modal
        isOpen={Boolean(activeGalleryAsset)}
        onClose={closeGallery}
        title={activeGalleryAsset ? getDisplayAssetName(activeGalleryAsset) : 'Слайд'}
        size="xl"
        elevated
      >
        {activeGalleryAsset && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 text-caption text-text-muted">
              <span>{(galleryIndex ?? 0) + 1} из {galleryAssets.length}</span>
              <a
                href={getImageUrl(activeGalleryAsset.filePath) || activeGalleryAsset.filePath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:text-accent-hover"
              >
                <Download className="h-4 w-4" aria-hidden />
                Скачать оригинал
              </a>
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <IconButton
                icon={ChevronLeft}
                title="Предыдущий слайд"
                size="md"
                variant="default"
                onClick={showPreviousGalleryAsset}
                disabled={galleryAssets.length <= 1}
              />
              <div className="flex min-h-[18rem] items-center justify-center rounded-lg bg-surface-inset p-2 sm:min-h-[28rem]">
                <img
                  src={getImageUrl(getProductAssetPreviewPath(activeGalleryAsset)) || getProductAssetPreviewPath(activeGalleryAsset)}
                  alt={getDisplayAssetName(activeGalleryAsset)}
                  className="max-h-[65vh] max-w-full object-contain"
                  decoding="async"
                />
              </div>
              <IconButton
                icon={ChevronRight}
                title="Следующий слайд"
                size="md"
                variant="default"
                onClick={showNextGalleryAsset}
                disabled={galleryAssets.length <= 1}
              />
            </div>

            {galleryAssets.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryAssets.map((asset, index) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
                      index === galleryIndex ? 'border-brand-yellow' : 'border-border-subtle'
                    }`}
                    onClick={() => setGalleryIndex(index)}
                    title={getDisplayAssetName(asset)}
                  >
                    <img
                      src={getImageUrl(getProductAssetThumbnailPath(asset)) || getProductAssetThumbnailPath(asset)}
                      alt={getDisplayAssetName(asset)}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
