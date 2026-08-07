import type { ProductAsset, ProductAssetType } from '../types';

const CP1251_HIGH_CHARS =
  '\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f' +
  '\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\ufffd\u2122\u0459\u203a\u045a\u045c\u045b\u045f' +
  '\u00a0\u040e\u045e\u0408\u00a4\u0490\u00a6\u00a7\u0401\u00a9\u0404\u00ab\u00ac\u00ad\u00ae\u0407' +
  '\u00b0\u00b1\u0406\u0456\u0491\u00b5\u00b6\u00b7\u0451\u2116\u0454\u00bb\u0458\u0405\u0455\u0457';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const PRODUCT_ASSET_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

export type ProductAssetUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export function buildProductAssetUploadConfig() {
  return { timeout: PRODUCT_ASSET_UPLOAD_TIMEOUT_MS };
}

export function calculateProductAssetUploadProgress(
  loaded: number,
  reportedTotal: number | undefined,
  fileSize: number
): ProductAssetUploadProgress {
  const total = reportedTotal && reportedTotal > 0 ? reportedTotal : fileSize;
  const safeLoaded = Math.min(Math.max(loaded, 0), total);
  const percent = total > 0 ? Math.round((safeLoaded / total) * 100) : 0;

  return { loaded: safeLoaded, total, percent };
}

function getExtension(value?: string | null) {
  const source = value || '';
  const clean = source.split('?')[0].split('#')[0];
  const dotIndex = clean.lastIndexOf('.');
  return dotIndex >= 0 ? clean.slice(dotIndex).toLowerCase() : '';
}

function cp1251ByteFromChar(char: string) {
  const code = char.charCodeAt(0);

  if (code <= 0x7f) return code;
  if (code >= 0x0410 && code <= 0x042f) return code - 0x0410 + 0xc0;
  if (code >= 0x0430 && code <= 0x044f) return code - 0x0430 + 0xe0;

  const highIndex = CP1251_HIGH_CHARS.indexOf(char);
  return highIndex >= 0 ? highIndex + 0x80 : null;
}

function decodeUtf8(bytes: number[]) {
  try {
    return decodeURIComponent(bytes.map((byte) => `%${byte.toString(16).padStart(2, '0')}`).join(''));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

function decodeCp1251Mojibake(value: string) {
  const bytes: number[] = [];

  for (const char of value) {
    const byte = cp1251ByteFromChar(char);
    if (byte === null) return null;
    bytes.push(byte);
  }

  return decodeUtf8(bytes);
}

function decodeLatin1Mojibake(value: string) {
  return decodeUtf8(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
}

function scoreFileNameCandidate(value: string) {
  const cyrillicCount = (value.match(/[\u0400-\u04ff]/g) || []).length;
  const replacementCount = (value.match(/\ufffd/g) || []).length;
  const suspiciousCount = (value.match(/[\u00c2-\u00d1\u0080-\u009f]/g) || []).length;
  const commonBrokenPairCount = (value.match(/(?:\u0420|\u0421|[\u00d0\u00d1])/g) || []).length;

  return cyrillicCount * 3 - replacementCount * 30 - suspiciousCount * 8 - commonBrokenPairCount * 3;
}

export function normalizeAssetName(value?: string | null) {
  if (!value) return '';

  const trimmed = value.trim();
  const candidates = [
    trimmed,
    decodeLatin1Mojibake(trimmed),
    decodeCp1251Mojibake(trimmed),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.reduce((best, candidate) => (
    scoreFileNameCandidate(candidate) > scoreFileNameCandidate(best) ? candidate : best
  ), trimmed);
}

export function getDisplayAssetName(asset: ProductAsset) {
  const rawName = asset.originalName || asset.filePath.split('/').pop() || asset.filePath;
  return normalizeAssetName(rawName);
}

export function getProductAssetThumbnailPath(asset: ProductAsset) {
  return asset.thumbnailPath || asset.filePath;
}

export function getProductAssetPreviewPath(asset: ProductAsset) {
  return asset.previewPath || asset.filePath;
}

export function isPsdFileName(fileName?: string | null) {
  return getExtension(fileName) === '.psd';
}

export function recommendAssetTypeForFiles(files: File[], currentType: ProductAssetType): ProductAssetType {
  if (files.length > 0 && isPsdFileName(files[0].name)) return 'psd_source';
  return currentType;
}

export function isPreviewableImageAsset(asset: ProductAsset) {
  if (asset.assetType === 'psd_source' || isPsdFileName(asset.originalName || asset.filePath)) {
    return false;
  }

  const extension = getExtension(asset.originalName || asset.filePath);
  return Boolean(asset.mimeType?.startsWith('image/')) || IMAGE_EXTENSIONS.has(extension);
}

export function getGalleryImageAssets(assets: ProductAsset[]) {
  return assets.filter(isPreviewableImageAsset);
}
