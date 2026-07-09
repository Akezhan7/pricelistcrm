const assert = require('assert');
const {
  PRODUCT_ASSET_TYPES,
  buildProductAssetData,
  validateProductAssetUpload,
} = require('../services/productAssetService');

function testBuildsProductAssetData() {
  const asset = buildProductAssetData({
    productId: 15,
    uploadedBy: 7,
    revisionRequestId: null,
    assetType: PRODUCT_ASSET_TYPES.PRODUCT_PHOTO,
    file: {
      filename: 'photo-1.jpg',
      originalname: 'Photo 1.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    },
    notes: 'Main photo',
    sortOrder: 3,
  });

  assert.deepStrictEqual(asset, {
    productId: 15,
    uploadedBy: 7,
    revisionRequestId: null,
    assetType: PRODUCT_ASSET_TYPES.PRODUCT_PHOTO,
    filePath: '/uploads/photo-1.jpg',
    originalName: 'Photo 1.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024,
    notes: 'Main photo',
    sortOrder: 3,
    isActive: true,
  });
}

function testValidatesAllowedUploads() {
  assert.doesNotThrow(() =>
    validateProductAssetUpload({
      assetType: PRODUCT_ASSET_TYPES.PRODUCT_PHOTO,
      file: { originalname: 'photo.webp', mimetype: 'image/webp', size: 5 * 1024 * 1024 },
    })
  );

  assert.doesNotThrow(() =>
    validateProductAssetUpload({
      assetType: PRODUCT_ASSET_TYPES.SLIDE_JPG,
      file: { originalname: 'slide.jpg', mimetype: 'image/jpeg', size: 8 * 1024 * 1024 },
    })
  );

  assert.doesNotThrow(() =>
    validateProductAssetUpload({
      assetType: PRODUCT_ASSET_TYPES.PSD_SOURCE,
      file: {
        originalname: 'source.psd',
        mimetype: 'application/octet-stream',
        size: 120 * 1024 * 1024,
      },
    })
  );
}

function testRejectsInvalidUploads() {
  assert.throws(
    () =>
      validateProductAssetUpload({
        assetType: 'bad_type',
        file: { originalname: 'photo.jpg', mimetype: 'image/jpeg', size: 1024 },
      }),
    /unsupported asset type/i
  );

  assert.throws(
    () =>
      validateProductAssetUpload({
        assetType: PRODUCT_ASSET_TYPES.PRODUCT_PHOTO,
        file: { originalname: 'manual.pdf', mimetype: 'application/pdf', size: 1024 },
      }),
    /file type is not allowed/i
  );

  assert.throws(
    () =>
      validateProductAssetUpload({
        assetType: PRODUCT_ASSET_TYPES.SLIDE_JPG,
        file: { originalname: 'slide.png', mimetype: 'image/png', size: 1024 },
      }),
    /file type is not allowed/i
  );

  assert.throws(
    () =>
      validateProductAssetUpload({
        assetType: PRODUCT_ASSET_TYPES.PSD_SOURCE,
        file: {
          originalname: 'source.psd',
          mimetype: 'application/octet-stream',
          size: 220 * 1024 * 1024,
        },
      }),
    /file is too large/i
  );
}

testBuildsProductAssetData();
testValidatesAllowedUploads();
testRejectsInvalidUploads();

console.log('Product asset service test passed');
