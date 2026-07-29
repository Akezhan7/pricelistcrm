const assert = require('assert');
const {
  PRODUCT_ASSET_TYPES,
  buildProductAssetData,
  normalizeUploadedFileOriginalName,
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

  assert.doesNotThrow(() =>
    validateProductAssetUpload({
      assetType: PRODUCT_ASSET_TYPES.PSD_SOURCE,
      file: {
        originalname: 'source.psd',
        mimetype: '',
        size: 10 * 1024 * 1024,
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

function testNormalizesBrokenOriginalNames() {
  assert.strictEqual(
    normalizeUploadedFileOriginalName('\u0420\u040e\u0420\u00b5\u0421\u201a\u0420\u00b5\u0420\u0406\u0420\u0455\u0420\u2116 \u0421\u201e\u0420\u0451\u0420\u00bb\u0421\u040a\u0421\u201a\u0421\u0402 1-03.psd'),
    '\u0421\u0435\u0442\u0435\u0432\u043e\u0439 \u0444\u0438\u043b\u044c\u0442\u0440 1-03.psd'
  );

  assert.strictEqual(
    normalizeUploadedFileOriginalName('\u00d0\u00a1\u00d0\u00b5\u00d1\u0082\u00d0\u00b5\u00d0\u00b2\u00d0\u00be\u00d0\u00b9 \u00d1\u0084\u00d0\u00b8\u00d0\u00bb\u00d1\u008c\u00d1\u0082\u00d1\u0080 1-03.png'),
    '\u0421\u0435\u0442\u0435\u0432\u043e\u0439 \u0444\u0438\u043b\u044c\u0442\u0440 1-03.png'
  );
}

testBuildsProductAssetData();
testValidatesAllowedUploads();
testRejectsInvalidUploads();
testNormalizesBrokenOriginalNames();

console.log('Product asset service test passed');
