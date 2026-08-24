const assert = require('assert');
const {
  buildProductCategoryFilter,
  buildProductSearchFilter,
  normalizeProductSearchTokens,
} = require('../services/productListQueryService');
const { Op } = require('sequelize');

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

function testBuildsCaseInsensitiveTokenSearch() {
  assert.deepStrictEqual(
    normalizeProductSearchTokens('  Малярный   СКОТЧ  '),
    ['малярный', 'скотч']
  );

  const filter = buildProductSearchFilter('Малярный СКОТЧ');
  assert.ok(Array.isArray(filter[Op.and]));
  assert.strictEqual(filter[Op.and].length, 2);

  const firstTokenFields = filter[Op.and][0][Op.or];
  assert.strictEqual(firstTokenFields.length, 5);
  assert.deepStrictEqual(firstTokenFields[0].name, { [Op.iLike]: '%малярный%' });
  assert.deepStrictEqual(firstTokenFields[1].article, { [Op.iLike]: '%малярный%' });

  const secondTokenFields = filter[Op.and][1][Op.or];
  assert.deepStrictEqual(secondTokenFields[0].name, { [Op.iLike]: '%скотч%' });
}

testBuildsCaseInsensitiveTokenSearch();

console.log('Product list query service test passed');
