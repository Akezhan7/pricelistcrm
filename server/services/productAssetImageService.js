const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const OPTIMIZABLE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function isOptimizableProductAssetImage(file) {
  const extension = path.extname(file?.originalname || file?.path || '').toLowerCase();
  return OPTIMIZABLE_EXTENSIONS.has(extension);
}

function getProductAssetImageVariantPaths(sourceFilePath) {
  const parsed = path.parse(sourceFilePath);
  const thumbnailFileName = `${parsed.name}-thumbnail.webp`;
  const previewFileName = `${parsed.name}-preview.webp`;

  return {
    thumbnailFilePath: path.join(parsed.dir, thumbnailFileName),
    previewFilePath: path.join(parsed.dir, previewFileName),
    thumbnailPath: `/uploads/${thumbnailFileName}`,
    previewPath: `/uploads/${previewFileName}`,
  };
}

async function removeProductAssetImageVariantFiles(paths) {
  const filePaths = [paths?.thumbnailFilePath, paths?.previewFilePath].filter(Boolean);
  await Promise.all(filePaths.map(async (filePath) => {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
}

async function createProductAssetImageVariants(file, options = {}) {
  if (!file?.path || !isOptimizableProductAssetImage(file)) return {};

  const paths = getProductAssetImageVariantPaths(file.path);
  const createThumbnail = options.thumbnail !== false;
  const createPreview = options.preview !== false;
  const generatedPaths = {
    ...(createThumbnail ? {
      thumbnailFilePath: paths.thumbnailFilePath,
      thumbnailPath: paths.thumbnailPath,
    } : {}),
    ...(createPreview ? {
      previewFilePath: paths.previewFilePath,
      previewPath: paths.previewPath,
    } : {}),
  };

  try {
    const tasks = [];
    if (createThumbnail) {
      tasks.push(sharp(file.path)
        .rotate()
        .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 76 })
        .toFile(paths.thumbnailFilePath));
    }
    if (createPreview) {
      tasks.push(sharp(file.path)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(paths.previewFilePath));
    }
    await Promise.all(tasks);

    return generatedPaths;
  } catch (error) {
    await removeProductAssetImageVariantFiles(generatedPaths);
    throw error;
  }
}

module.exports = {
  createProductAssetImageVariants,
  getProductAssetImageVariantPaths,
  isOptimizableProductAssetImage,
  removeProductAssetImageVariantFiles,
};
