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
const CP1251_HIGH_CHARS =
  '\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f' +
  '\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\ufffd\u2122\u0459\u203a\u045a\u045c\u045b\u045f' +
  '\u00a0\u040e\u045e\u0408\u00a4\u0490\u00a6\u00a7\u0401\u00a9\u0404\u00ab\u00ac\u00ad\u00ae\u0407' +
  '\u00b0\u00b1\u0406\u0456\u0491\u00b5\u00b6\u00b7\u0451\u2116\u0454\u00bb\u0458\u0405\u0455\u0457';

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

function cp1251ByteFromChar(char) {
  const code = char.charCodeAt(0);

  if (code <= 0x7f) return code;
  if (code >= 0x0410 && code <= 0x042f) return code - 0x0410 + 0xc0;
  if (code >= 0x0430 && code <= 0x044f) return code - 0x0430 + 0xe0;

  const highIndex = CP1251_HIGH_CHARS.indexOf(char);
  return highIndex >= 0 ? highIndex + 0x80 : null;
}

function decodeCp1251Mojibake(value) {
  const bytes = [];

  for (const char of value) {
    const byte = cp1251ByteFromChar(char);
    if (byte === null) return null;
    bytes.push(byte);
  }

  return Buffer.from(bytes).toString('utf8');
}

function decodeLatin1Mojibake(value) {
  return Buffer.from(value, 'latin1').toString('utf8');
}

function scoreFileNameCandidate(value) {
  if (!value) return -1000;

  const cyrillicCount = (value.match(/[\u0400-\u04ff]/g) || []).length;
  const replacementCount = (value.match(/\ufffd/g) || []).length;
  const suspiciousCount = (value.match(/[\u00c2-\u00d1\u0080-\u009f]/g) || []).length;
  const commonBrokenPairCount = (value.match(/(?:\u0420|\u0421|[\u00d0\u00d1])/g) || []).length;

  return cyrillicCount * 3 - replacementCount * 30 - suspiciousCount * 8 - commonBrokenPairCount * 3;
}

function normalizeUploadedFileOriginalName(originalName) {
  if (!originalName) return null;

  const trimmed = String(originalName).trim();
  const candidates = [
    trimmed,
    decodeLatin1Mojibake(trimmed),
    decodeCp1251Mojibake(trimmed),
  ].filter(Boolean);

  return candidates.reduce((best, candidate) => (
    scoreFileNameCandidate(candidate) > scoreFileNameCandidate(best) ? candidate : best
  ), trimmed);
}

function validateProductAssetUpload({ assetType, file }) {
  const profile = getProductAssetUploadProfile(assetType);

  if (!file) {
    throw new Error('file is required');
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const isPsdByExtension = extension === '.psd';
  const mimeAllowed = profile.mimeTypes.includes(file.mimetype) || (!file.mimetype && isPsdByExtension);
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
    originalName: normalizeUploadedFileOriginalName(file.originalname),
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
  normalizeUploadedFileOriginalName,
  validateProductAssetUpload,
};
