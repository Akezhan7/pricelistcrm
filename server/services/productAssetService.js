const path = require('path');

const PRODUCT_ASSET_TYPES = Object.freeze({
  PRODUCT_PHOTO: 'product_photo',
  SLIDE_JPG: 'slide_jpg',
  PSD_SOURCE: 'psd_source',
  REVISION_ATTACHMENT: 'revision_attachment',
  PATENT_FILE: 'patent_file',
  OTHER: 'other',
});

const PRODUCT_ASSET_TYPE_VALUES = Object.freeze(Object.values(PRODUCT_ASSET_TYPES));

const MB = 1024 * 1024;

const PRODUCT_ASSET_UPLOAD_PROFILES = Object.freeze({
  [PRODUCT_ASSET_TYPES.PRODUCT_PHOTO]: Object.freeze({
    maxSize: parseInt(process.env.MAX_PRODUCT_IMAGE_FILE_SIZE, 10) || 10 * MB,
    mimeTypes: Object.freeze(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
    extensions: Object.freeze(['.jpg', '.jpeg', '.png', '.gif', '.webp']),
  }),
  [PRODUCT_ASSET_TYPES.SLIDE_JPG]: Object.freeze({
    maxSize: parseInt(process.env.MAX_PRODUCT_SLIDE_FILE_SIZE, 10) || 20 * MB,
    mimeTypes: Object.freeze(['image/jpeg', 'image/jpg']),
    extensions: Object.freeze(['.jpg', '.jpeg']),
  }),
  [PRODUCT_ASSET_TYPES.PSD_SOURCE]: Object.freeze({
    maxSize: parseInt(process.env.MAX_PSD_FILE_SIZE, 10) || 200 * MB,
    mimeTypes: Object.freeze([
      'application/octet-stream',
      'application/x-photoshop',
      'application/photoshop',
      'image/vnd.adobe.photoshop',
      'image/photoshop',
    ]),
    extensions: Object.freeze(['.psd']),
  }),
  [PRODUCT_ASSET_TYPES.REVISION_ATTACHMENT]: Object.freeze({
    maxSize: parseInt(process.env.MAX_PRODUCT_ATTACHMENT_FILE_SIZE, 10) || 50 * MB,
    mimeTypes: Object.freeze([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/octet-stream',
    ]),
    extensions: Object.freeze(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.psd']),
  }),
  [PRODUCT_ASSET_TYPES.PATENT_FILE]: Object.freeze({
    maxSize: parseInt(process.env.MAX_PRODUCT_ATTACHMENT_FILE_SIZE, 10) || 50 * MB,
    mimeTypes: Object.freeze(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']),
    extensions: Object.freeze(['.pdf', '.jpg', '.jpeg', '.png']),
  }),
  [PRODUCT_ASSET_TYPES.OTHER]: Object.freeze({
    maxSize: parseInt(process.env.MAX_PRODUCT_ATTACHMENT_FILE_SIZE, 10) || 50 * MB,
    mimeTypes: Object.freeze([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream',
    ]),
    extensions: Object.freeze(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.zip', '.psd']),
  }),
});

function getProductAssetUploadProfile(assetType) {
  if (!PRODUCT_ASSET_UPLOAD_PROFILES[assetType]) {
    throw new Error('unsupported asset type');
  }

  return PRODUCT_ASSET_UPLOAD_PROFILES[assetType];
}

function normalizeSortOrder(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function validateProductAssetUpload({ assetType, file }) {
  const profile = getProductAssetUploadProfile(assetType);

  if (!file) {
    throw new Error('file is required');
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeAllowed = profile.mimeTypes.includes(file.mimetype);
  const extensionAllowed = profile.extensions.includes(extension);

  if (!mimeAllowed || !extensionAllowed) {
    throw new Error('file type is not allowed for this asset type');
  }

  if (Number(file.size) > profile.maxSize) {
    throw new Error('file is too large for this asset type');
  }
}

function buildProductAssetData({
  productId,
  uploadedBy,
  assetType,
  file,
  notes = null,
  sortOrder = 0,
  revisionRequestId = null,
}) {
  validateProductAssetUpload({ assetType, file });

  return {
    productId: Number(productId),
    uploadedBy: uploadedBy ? Number(uploadedBy) : null,
    revisionRequestId: revisionRequestId ? Number(revisionRequestId) : null,
    assetType,
    filePath: `/uploads/${file.filename}`,
    originalName: file.originalname || null,
    mimeType: file.mimetype || null,
    fileSize: Number(file.size) || null,
    notes: notes || null,
    sortOrder: normalizeSortOrder(sortOrder),
    isActive: true,
  };
}

module.exports = {
  PRODUCT_ASSET_TYPES,
  PRODUCT_ASSET_TYPE_VALUES,
  PRODUCT_ASSET_UPLOAD_PROFILES,
  buildProductAssetData,
  getProductAssetUploadProfile,
  validateProductAssetUpload,
};
