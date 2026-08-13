const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const {
  DEFAULT_CHUNK_SIZE,
  createUploadSession,
  saveUploadChunk,
  assembleUploadSession,
  removeUploadSession,
} = require('../services/productAssetChunkUploadService');
const {
  PRODUCT_ASSET_CHUNK_FILE_LIMIT,
  handleUploadError,
  uploadProductAssetChunk,
} = require('../middleware/upload');

async function testChunkMiddlewareAcceptsCompleteChunk() {
  const app = express();
  app.post(
    '/chunk',
    uploadProductAssetChunk.single('chunk'),
    handleUploadError,
    (req, res) => res.json({ size: req.file.size })
  );
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const { port } = server.address();
    const form = new FormData();
    form.append('chunk', new Blob([Buffer.alloc(DEFAULT_CHUNK_SIZE)]), 'chunk.psd');
    const response = await fetch(`http://127.0.0.1:${port}/chunk`, {
      method: 'POST',
      body: form,
    });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { size: DEFAULT_CHUNK_SIZE });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function run() {
  assert.ok(
    PRODUCT_ASSET_CHUNK_FILE_LIMIT > DEFAULT_CHUNK_SIZE,
    'Multer file limit must be larger than a complete upload chunk'
  );
  await testChunkMiddlewareAcceptsCompleteChunk();

  const rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'crm-asset-upload-'));
  const content = Buffer.from('large psd content split into several chunks');
  const chunkSize = 12;

  try {
    const session = await createUploadSession({
      rootDir,
      productId: 15,
      uploadedBy: 7,
      assetType: 'psd_source',
      originalName: 'source.psd',
      mimeType: 'application/octet-stream',
      fileSize: content.length,
      notes: 'PSD source',
      chunkSize,
    });

    assert.strictEqual(session.totalChunks, Math.ceil(content.length / chunkSize));

    for (let index = 0; index < session.totalChunks; index += 1) {
      const start = index * chunkSize;
      await saveUploadChunk({
        rootDir,
        uploadId: session.uploadId,
        productId: 15,
        uploadedBy: 7,
        chunkIndex: index,
        buffer: content.subarray(start, Math.min(start + chunkSize, content.length)),
      });
    }

    const file = await assembleUploadSession({
      rootDir,
      uploadId: session.uploadId,
      productId: 15,
      uploadedBy: 7,
    });

    assert.strictEqual(file.originalname, 'source.psd');
    assert.strictEqual(file.size, content.length);
    assert.deepStrictEqual(await fs.promises.readFile(file.path), content);

    await removeUploadSession({ rootDir, uploadId: session.uploadId });
    assert.strictEqual(fs.existsSync(session.sessionDir), false);
  } finally {
    await fs.promises.rm(rootDir, { recursive: true, force: true });
  }

  console.log('Product asset chunk upload service test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
