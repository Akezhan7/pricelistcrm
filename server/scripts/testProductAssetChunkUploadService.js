const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createUploadSession,
  saveUploadChunk,
  assembleUploadSession,
  removeUploadSession,
} = require('../services/productAssetChunkUploadService');

async function run() {
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
