const assert = require('assert');
const {
  buildProductCategoryFilter,
  buildProductSearchFilter,
  buildProductSearchOrder,
  buildProductSupplierFilter,
  findPaginatedProducts,
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
  assert.strictEqual(firstTokenFields.length, 2);
  assert.deepStrictEqual(firstTokenFields[0].name, { [Op.iLike]: '%малярный%' });
  assert.deepStrictEqual(firstTokenFields[1].article, { [Op.iLike]: '%малярный%' });

  const secondTokenFields = filter[Op.and][1][Op.or];
  assert.deepStrictEqual(secondTokenFields[0].name, { [Op.iLike]: '%скотч%' });
}

testBuildsCaseInsensitiveTokenSearch();

function testDoesNotSearchHiddenProductNames() {
  const filter = buildProductSearchFilter('drill');
  const searchedFields = filter[Op.and][0][Op.or].map((condition) => Object.keys(condition)[0]);

  assert.deepStrictEqual(searchedFields, ['name', 'article']);
}

function testBuildsRelevantSearchOrder() {
  const sql = {
    escape: (value) => `'${value}'`,
    literal: (value) => ({ sql: value }),
  };
  const order = buildProductSearchOrder('  Marker  ', sql);

  assert.strictEqual(order.length, 2);
  assert.match(order[0][0].sql, /LOWER\("Product"\."article"\) = 'marker'/);
  assert.match(order[0][0].sql, /LOWER\("Product"\."name"\) = 'marker'/);
  assert.match(order[0][0].sql, /POSITION\('marker' IN LOWER\("Product"\."name"\)\) = 1/);
  assert.deepStrictEqual(order[1], ['name', 'ASC']);
}

function testBuildsProductsWithoutSupplierFilter() {
  assert.deepStrictEqual(buildProductSupplierFilter(undefined), {});
  assert.deepStrictEqual(
    buildProductSupplierFilter('without'),
    { '$suppliers.id$': { [Op.is]: null } }
  );
  assert.throws(() => buildProductSupplierFilter('wrong'), /invalid supplier status/i);
}

testDoesNotSearchHiddenProductNames();
testBuildsRelevantSearchOrder();
testBuildsProductsWithoutSupplierFilter();

async function testPaginatesProductIdsBeforeHydratingAssociations() {
  const calls = [];
  const productModel = {
    async findAndCountAll(options) {
      calls.push({ method: 'findAndCountAll', options });
      return {
        count: 1202,
        rows: [{ id: 1001 }, { id: 1002 }],
      };
    },
    async findAll(options) {
      calls.push({ method: 'findAll', options });
      return [{ id: 1002 }, { id: 1001 }];
    },
  };

  const result = await findPaginatedProducts({
    productModel,
    where: { isActive: true },
    include: [{ as: 'suppliers' }],
    limit: 2,
    offset: 1000,
    order: [['createdAt', 'DESC']],
  });

  assert.strictEqual(calls[0].options.include, undefined);
  assert.strictEqual(calls[0].options.offset, 1000);
  assert.deepStrictEqual(calls[1].options.include, [{ as: 'suppliers' }]);
  assert.deepStrictEqual(result.rows.map((product) => product.id), [1001, 1002]);
  assert.strictEqual(result.count, 1202);
}

testPaginatesProductIdsBeforeHydratingAssociations()
  .then(() => console.log('Product list query service test passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
