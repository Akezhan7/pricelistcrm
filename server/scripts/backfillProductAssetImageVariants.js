require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const { ProductAsset, sequelize } = require('../models');
const { uploadsDir } = require('../middleware/upload');
const {
  createProductAssetImageVariants,
  isOptimizableProductAssetImage,
  removeProductAssetImageVariantFiles,
} = require('../services/productAssetImageService');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  await sequelize.authenticate();

  const assets = await ProductAsset.findAll({
    where: {
      isActive: true,
      [Op.or]: [{ thumbnailPath: null }, { previewPath: null }],
    },
    order: [['id', 'ASC']],
  });

  let optimized = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of assets) {
    const sourceFilePath = path.join(uploadsDir, path.basename(asset.filePath));
    const file = {
      path: sourceFilePath,
      originalname: asset.originalName || asset.filePath,
      mimetype: asset.mimeType || '',
    };

    if (!isOptimizableProductAssetImage(file) || !(await fileExists(sourceFilePath))) {
      skipped += 1;
      continue;
    }

    let variants;
    try {
      variants = await createProductAssetImageVariants(file, {
        thumbnail: !asset.thumbnailPath,
        preview: !asset.previewPath,
      });
      await asset.update({
        thumbnailPath: asset.thumbnailPath || variants.thumbnailPath,
        previewPath: asset.previewPath || variants.previewPath,
      });
      optimized += 1;
    } catch (error) {
      failed += 1;
      if (variants) await removeProductAssetImageVariantFiles(variants);
      console.error(`Failed to optimize product asset ${asset.id}: ${error.message}`);
    }
  }

  console.log(`Product asset image backfill complete: optimized=${optimized}, skipped=${skipped}, failed=${failed}`);
}

run()
  .catch((error) => {
    console.error('Product asset image backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
