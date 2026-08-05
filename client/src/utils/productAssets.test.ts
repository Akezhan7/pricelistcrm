import type { ProductAsset } from '../types';
import {
  buildProductAssetUploadConfig,
  calculateProductAssetUploadProgress,
  getDisplayAssetName,
  getGalleryImageAssets,
  recommendAssetTypeForFiles,
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
});
