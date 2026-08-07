const assert = require('assert');
const {
  getProductAssetImageVariantPaths,
  isOptimizableProductAssetImage,
} = require('../services/productAssetImageService');

function testRecognizesOptimizableImages() {
  assert.strictEqual(isOptimizableProductAssetImage({
    originalname: 'slide.png',
    mimetype: 'image/png',
  }), true);
  assert.strictEqual(isOptimizableProductAssetImage({
    originalname: 'source.psd',
    mimetype: 'application/octet-stream',
  }), false);
  assert.strictEqual(isOptimizableProductAssetImage({
    originalname: 'animation.gif',
    mimetype: 'image/gif',
  }), false);
}

function testBuildsStableVariantPaths() {
  assert.deepStrictEqual(
    getProductAssetImageVariantPaths('D:\\crm\\uploads\\slide-123.png'),
    {
      thumbnailFilePath: 'D:\\crm\\uploads\\slide-123-thumbnail.webp',
      previewFilePath: 'D:\\crm\\uploads\\slide-123-preview.webp',
      thumbnailPath: '/uploads/slide-123-thumbnail.webp',
      previewPath: '/uploads/slide-123-preview.webp',
    }
  );
}

testRecognizesOptimizableImages();
testBuildsStableVariantPaths();

console.log('Product asset image service test passed');
