const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { validateProductAssetUpload } = require('./productAssetService');

const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MANIFEST_FILE = 'manifest.json';

function createUploadError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getSessionsRoot(rootDir) {
  return path.join(path.dirname(rootDir), '.product-asset-upload-sessions');
}

function assertUploadId(uploadId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(uploadId || ''))) {
    throw createUploadError('invalid upload session');
  }
}

function getSessionDir(rootDir, uploadId) {
  assertUploadId(uploadId);
  return path.join(getSessionsRoot(rootDir), uploadId);
}

function getManifestPath(rootDir, uploadId) {
  return path.join(getSessionDir(rootDir, uploadId), MANIFEST_FILE);
}

async function readManifest(rootDir, uploadId) {
  try {
    return JSON.parse(await fs.promises.readFile(getManifestPath(rootDir, uploadId), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw createUploadError('upload session not found', 404);
    throw error;
  }
}

function assertSessionOwner(manifest, productId, uploadedBy) {
  if (Number(manifest.productId) !== Number(productId) || Number(manifest.uploadedBy) !== Number(uploadedBy)) {
    throw createUploadError('upload session does not belong to this user', 403);
  }
}

async function cleanupExpiredUploadSessions(rootDir, now = Date.now()) {
  const sessionsRoot = getSessionsRoot(rootDir);
  let entries = [];
  try {
    entries = await fs.promises.readdir(sessionsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return;
  }

  await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const sessionDir = path.join(sessionsRoot, entry.name);
    try {
      const stats = await fs.promises.stat(sessionDir);
      if (now - stats.mtimeMs > SESSION_TTL_MS) {
        await fs.promises.rm(sessionDir, { recursive: true, force: true });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
}

async function createUploadSession({
  rootDir,
  productId,
  uploadedBy,
  assetType,
  originalName,
  mimeType,
  fileSize,
  notes = null,
  chunkSize = DEFAULT_CHUNK_SIZE,
}) {
  const normalizedSize = Number(fileSize);
  const normalizedChunkSize = Number(chunkSize);
  if (!Number.isInteger(normalizedSize) || normalizedSize <= 0) {
    throw createUploadError('invalid file size');
  }
  if (!Number.isInteger(normalizedChunkSize) || normalizedChunkSize <= 0 || normalizedChunkSize > DEFAULT_CHUNK_SIZE) {
    throw createUploadError('invalid chunk size');
  }

  validateProductAssetUpload({
    assetType,
    file: { originalname: originalName, mimetype: mimeType || '', size: normalizedSize },
  });

  await fs.promises.mkdir(rootDir, { recursive: true });
  cleanupExpiredUploadSessions(rootDir).catch((error) => {
    console.warn('Failed to clean expired product asset uploads:', error.message);
  });

  const uploadId = crypto.randomUUID();
  const sessionDir = getSessionDir(rootDir, uploadId);
  const manifest = {
    uploadId,
    productId: Number(productId),
    uploadedBy: Number(uploadedBy),
    assetType,
    originalName: String(originalName),
    mimeType: mimeType || 'application/octet-stream',
    fileSize: normalizedSize,
    notes: notes || null,
    chunkSize: normalizedChunkSize,
    totalChunks: Math.ceil(normalizedSize / normalizedChunkSize),
    createdAt: new Date().toISOString(),
  };

  await fs.promises.mkdir(sessionDir, { recursive: true });
  await fs.promises.writeFile(getManifestPath(rootDir, uploadId), JSON.stringify(manifest), { flag: 'wx' });

  return { ...manifest, sessionDir };
}

async function saveUploadChunk({ rootDir, uploadId, productId, uploadedBy, chunkIndex, buffer }) {
  const manifest = await readManifest(rootDir, uploadId);
  assertSessionOwner(manifest, productId, uploadedBy);

  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0 || index >= manifest.totalChunks) {
    throw createUploadError('invalid chunk index');
  }
  if (!Buffer.isBuffer(buffer)) throw createUploadError('chunk is required');

  const expectedSize = index === manifest.totalChunks - 1
    ? manifest.fileSize - index * manifest.chunkSize
    : manifest.chunkSize;
  if (buffer.length !== expectedSize) throw createUploadError('invalid chunk size');

  const chunkPath = path.join(getSessionDir(rootDir, uploadId), `chunk-${index}`);
  const tempPath = `${chunkPath}.tmp`;
  await fs.promises.writeFile(tempPath, buffer);
  await fs.promises.rename(tempPath, chunkPath);

  return { chunkIndex: index };
}

function buildStoredFileName(originalName) {
  const extension = path.extname(originalName || '').toLowerCase();
  const base = path.basename(originalName || 'asset', extension)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'asset';
  return `${base}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
}

async function assembleUploadSession({ rootDir, uploadId, productId, uploadedBy }) {
  const manifest = await readManifest(rootDir, uploadId);
  assertSessionOwner(manifest, productId, uploadedBy);

  const sessionDir = getSessionDir(rootDir, uploadId);
  for (let index = 0; index < manifest.totalChunks; index += 1) {
    try {
      const stats = await fs.promises.stat(path.join(sessionDir, `chunk-${index}`));
      const expectedSize = index === manifest.totalChunks - 1
        ? manifest.fileSize - index * manifest.chunkSize
        : manifest.chunkSize;
      if (stats.size !== expectedSize) throw createUploadError(`chunk ${index} is incomplete`, 409);
    } catch (error) {
      if (error.code === 'ENOENT') throw createUploadError(`chunk ${index} is missing`, 409);
      throw error;
    }
  }

  const filename = buildStoredFileName(manifest.originalName);
  const destination = path.join(rootDir, filename);
  try {
    for (let index = 0; index < manifest.totalChunks; index += 1) {
      await pipeline(
        fs.createReadStream(path.join(sessionDir, `chunk-${index}`)),
        fs.createWriteStream(destination, { flags: index === 0 ? 'wx' : 'a' })
      );
    }

    const stats = await fs.promises.stat(destination);
    if (stats.size !== manifest.fileSize) throw createUploadError('assembled file size does not match', 409);
  } catch (error) {
    await fs.promises.rm(destination, { force: true });
    throw error;
  }

  return {
    filename,
    path: destination,
    originalname: manifest.originalName,
    mimetype: manifest.mimeType,
    size: manifest.fileSize,
    assetType: manifest.assetType,
    notes: manifest.notes,
  };
}

async function removeUploadSession({ rootDir, uploadId, productId, uploadedBy }) {
  if (productId !== undefined || uploadedBy !== undefined) {
    const manifest = await readManifest(rootDir, uploadId);
    assertSessionOwner(manifest, productId, uploadedBy);
  }
  await fs.promises.rm(getSessionDir(rootDir, uploadId), { recursive: true, force: true });
}

module.exports = {
  DEFAULT_CHUNK_SIZE,
  assembleUploadSession,
  cleanupExpiredUploadSessions,
  createUploadSession,
  removeUploadSession,
  saveUploadChunk,
};
