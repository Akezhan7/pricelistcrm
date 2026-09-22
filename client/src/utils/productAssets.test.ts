import type { ProductAsset } from '../types';
import {
  PRODUCT_ASSET_CHUNK_MAX_ATTEMPTS,
  PRODUCT_ASSET_CHUNK_STALL_TIMEOUT_MS,
  buildChunkUploadConfig,
  buildProductAssetUploadConfig,
  buildChunkUploadProgress,
  buildUploadSessionStorageKey,
  calculateProductAssetUploadProgress,
  calculateUploadedChunkBytes,
  clearCachedUploadSessionId,
  getDisplayAssetName,
  getProductAssetPreviewPath,
  getProductAssetThumbnailPath,
  getGalleryImageAssets,
  isChunkUploadStalled,
  isResumableUploadSession,
  loadCachedUploadSessionId,
  recommendAssetTypeForFiles,
  getChunkRetryDelayMs,
  saveCachedUploadSessionId,
  selectPendingChunkIndexes,
  shouldKeepUploadSessionForResume,
  shouldUseChunkedUpload,
  shouldRetryChunkUpload,
} from './productAssets';

const baseAsset: ProductAsset = {
  id: 1,
  productId: 10,
  assetType: 'slide_jpg',
  filePath: '/uploads/slide.jpg',
  sortOrder: 0,
  isActive: true,
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
};

describe('productAssets helpers', () => {
  it('restores display names saved as cp1251 mojibake', () => {
    const asset: ProductAsset = {
      ...baseAsset,
      originalName:
        '\u0420\u040e\u0420\u00b5\u0421\u201a\u0420\u00b5\u0420\u0406\u0420\u0455\u0420\u2116 \u0421\u201e\u0420\u0451\u0420\u00bb\u0421\u040a\u0421\u201a\u0421\u0402 1-03.png',
    };

    expect(getDisplayAssetName(asset)).toBe(
      '\u0421\u0435\u0442\u0435\u0432\u043e\u0439 \u0444\u0438\u043b\u044c\u0442\u0440 1-03.png'
    );
  });

  it('recommends PSD source type when the first selected file is psd', () => {
    const file = new File(['content'], 'source.psd', { type: '' });

    expect(recommendAssetTypeForFiles([file], 'other')).toBe('psd_source');
  });

  it('keeps only image assets in gallery order', () => {
    const assets: ProductAsset[] = [
      { ...baseAsset, id: 1, originalName: 'source.psd', assetType: 'psd_source', mimeType: 'application/octet-stream' },
      { ...baseAsset, id: 2, originalName: 'slide-2.png', assetType: 'slide_jpg', mimeType: 'image/png' },
      { ...baseAsset, id: 3, originalName: 'slide-1.jpg', assetType: 'slide_jpg', mimeType: 'image/jpeg' },
    ];

    expect(getGalleryImageAssets(assets).map((asset) => asset.id)).toEqual([2, 3]);
  });

  it('uses a dedicated long timeout for product asset uploads', () => {
    const config = buildProductAssetUploadConfig();

    expect(config.timeout).toBe(10 * 60 * 1000);
  });

  it('calculates upload progress from transferred and file bytes', () => {
    expect(calculateProductAssetUploadProgress(55, undefined, 110)).toEqual({
      loaded: 55,
      total: 110,
      percent: 50,
    });
    expect(calculateProductAssetUploadProgress(150, 100, 100).percent).toBe(100);
  });

  it('uses chunked transport for files larger than one upload chunk', () => {
    expect(shouldUseChunkedUpload(10 * 1024 * 1024)).toBe(false);
    expect(shouldUseChunkedUpload(10 * 1024 * 1024 + 1)).toBe(true);
  });

  it('calculates aggregate progress across uploaded chunks', () => {
    expect(buildChunkUploadProgress(20, 5, 100)).toEqual({
      loaded: 25,
      total: 100,
      percent: 25,
    });
    expect(buildChunkUploadProgress(90, 20, 100).percent).toBe(100);
  });

  it('retries only temporary chunk upload failures', () => {
    expect(shouldRetryChunkUpload(undefined, 0)).toBe(true);
    expect(shouldRetryChunkUpload(503, 1)).toBe(true);
    expect(shouldRetryChunkUpload(429, 1)).toBe(true);
    expect(shouldRetryChunkUpload(400, 0)).toBe(false);
    expect(shouldRetryChunkUpload(503, PRODUCT_ASSET_CHUNK_MAX_ATTEMPTS - 1)).toBe(false);
  });

  it('adds an exponential capped delay before retrying a failed chunk', () => {
    expect(getChunkRetryDelayMs(0)).toBe(1000);
    expect(getChunkRetryDelayMs(1)).toBe(2000);
    expect(getChunkRetryDelayMs(2)).toBe(4000);
    expect(getChunkRetryDelayMs(9)).toBe(8000);
  });

  it('caps a single chunk attempt far below the whole-file upload timeout', () => {
    expect(buildChunkUploadConfig().timeout).toBeLessThan(
      buildProductAssetUploadConfig().timeout
    );
  });

  it('detects a chunk that stopped transferring bytes', () => {
    const startedAt = 1_000_000;

    expect(isChunkUploadStalled(startedAt, startedAt + 5_000)).toBe(false);
    expect(
      isChunkUploadStalled(startedAt, startedAt + PRODUCT_ASSET_CHUNK_STALL_TIMEOUT_MS - 1)
    ).toBe(false);
    expect(
      isChunkUploadStalled(startedAt, startedAt + PRODUCT_ASSET_CHUNK_STALL_TIMEOUT_MS)
    ).toBe(true);
  });

  it('skips chunks the server already received', () => {
    expect(selectPendingChunkIndexes(5, [0, 1])).toEqual([2, 3, 4]);
    expect(selectPendingChunkIndexes(3, [])).toEqual([0, 1, 2]);
    expect(selectPendingChunkIndexes(3, [0, 1, 2])).toEqual([]);
  });

  it('counts already uploaded bytes including a shorter final chunk', () => {
    const session = { uploadId: 'u', chunkSize: 10, totalChunks: 3, fileSize: 25 };

    expect(calculateUploadedChunkBytes([0, 1], session)).toBe(20);
    expect(calculateUploadedChunkBytes([2], session)).toBe(5);
    expect(calculateUploadedChunkBytes([0, 1, 2], session)).toBe(25);
  });

  it('keeps an upload session for resume only when the failure was transient', () => {
    expect(shouldKeepUploadSessionForResume(undefined)).toBe(true);
    expect(shouldKeepUploadSessionForResume(502)).toBe(true);
    expect(shouldKeepUploadSessionForResume(429)).toBe(true);
    expect(shouldKeepUploadSessionForResume(400)).toBe(false);
    expect(shouldKeepUploadSessionForResume(403)).toBe(false);
    expect(shouldKeepUploadSessionForResume(404)).toBe(false);
  });

  it('resumes a cached session only when it still matches the selected file', () => {
    const file = { name: 'source.psd', size: 25, lastModified: 42 };
    const status = {
      uploadId: 'session-1',
      assetType: 'psd_source' as const,
      fileSize: 25,
      chunkSize: 10,
      totalChunks: 3,
      receivedChunks: [0],
    };

    expect(isResumableUploadSession(status, file, 'psd_source')).toBe(true);
    expect(isResumableUploadSession({ ...status, fileSize: 26 }, file, 'psd_source')).toBe(false);
    expect(isResumableUploadSession({ ...status, uploadId: '' }, file, 'psd_source')).toBe(false);
    expect(isResumableUploadSession(status, file, 'slide_jpg')).toBe(false);
  });

  it('caches the upload session id per product and selected file', () => {
    const file = { name: 'source.psd', size: 25, lastModified: 42 };
    const key = buildUploadSessionStorageKey(7, file);

    expect(key).not.toBe(buildUploadSessionStorageKey(8, file));
    expect(key).not.toBe(buildUploadSessionStorageKey(7, { ...file, size: 26 }));

    expect(loadCachedUploadSessionId(key)).toBeNull();
    saveCachedUploadSessionId(key, 'session-1');
    expect(loadCachedUploadSessionId(key)).toBe('session-1');
    clearCachedUploadSessionId(key);
    expect(loadCachedUploadSessionId(key)).toBeNull();
  });

  it('selects optimized image paths with an original fallback', () => {
    const optimizedAsset: ProductAsset = {
      ...baseAsset,
      thumbnailPath: '/uploads/slide-thumbnail.webp',
      previewPath: '/uploads/slide-preview.webp',
    };

    expect(getProductAssetThumbnailPath(optimizedAsset)).toBe('/uploads/slide-thumbnail.webp');
    expect(getProductAssetPreviewPath(optimizedAsset)).toBe('/uploads/slide-preview.webp');
    expect(getProductAssetThumbnailPath(baseAsset)).toBe('/uploads/slide.jpg');
    expect(getProductAssetPreviewPath(baseAsset)).toBe('/uploads/slide.jpg');
  });
});
