const assert = require('assert');
const {
  buildProductCategoryFilter,
} = require('../services/productListQueryService');

function testBuildsCategoryFilter() {
  assert.deepStrictEqual(buildProductCategoryFilter('42'), { categoryId: 42 });
  assert.deepStrictEqual(buildProductCategoryFilter(undefined), {});
}

function testRejectsInvalidCategoryFilter() {
  assert.throws(() => buildProductCategoryFilter('0'), /invalid category id/i);
  assert.throws(() => buildProductCategoryFilter('not-a-number'), /invalid category id/i);
}

testBuildsCategoryFilter();
testRejectsInvalidCategoryFilter();

console.log('Product list query service test passed');
