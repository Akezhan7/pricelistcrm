const { Op } = require('sequelize');

const PRODUCT_SEARCH_FIELDS = Object.freeze([
  'name',
  'article',
  'internalName',
  'kaspiName',
  'kaspiArticle',
]);

function normalizeProductSearchQuery(search) {
  if (typeof search !== 'string') return '';
  return search.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
}

function normalizeProductSearchTokens(search) {
  const normalizedSearch = normalizeProductSearchQuery(search);
  return normalizedSearch ? Array.from(new Set(normalizedSearch.split(' '))) : [];
}

function buildProductSearchFilter(search) {
  const tokens = normalizeProductSearchTokens(search);
  if (tokens.length === 0) return {};

  return {
    [Op.and]: tokens.map((token) => ({
      [Op.or]: PRODUCT_SEARCH_FIELDS.map((field) => ({
        [field]: { [Op.iLike]: `%${token}%` },
      })),
    })),
  };
}

function buildProductSearchOrder(search, sql) {
  const normalizedSearch = normalizeProductSearchQuery(search);
  if (!normalizedSearch) return [['createdAt', 'DESC']];

  const escapedSearch = sql.escape(normalizedSearch);
  const relevance = sql.literal(`CASE
    WHEN LOWER("Product"."article") = ${escapedSearch} THEN 0
    WHEN LOWER("Product"."name") = ${escapedSearch} THEN 1
    WHEN POSITION(${escapedSearch} IN LOWER("Product"."name")) = 1 THEN 2
    ELSE 3
  END`);

  return [
    [relevance, 'ASC'],
    ['name', 'ASC'],
  ];
}

function buildProductSupplierFilter(supplierStatus) {
  if (supplierStatus === undefined || supplierStatus === null || supplierStatus === '') {
    return {};
  }

  if (supplierStatus !== 'without') {
    throw new Error('invalid supplier status');
  }

  return { '$suppliers.id$': { [Op.is]: null } };
}

function buildProductCategoryFilter(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === '') {
    return {};
  }

  const parsedCategoryId = Number(categoryId);
  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    throw new Error('invalid category id');
  }

  return { categoryId: parsedCategoryId };
}

async function findPaginatedProducts({
  productModel,
  where,
  include,
  idInclude,
  limit,
  offset,
  order,
}) {
  const pageQuery = {
    where,
    attributes: ['id'],
    distinct: true,
    limit,
    offset,
    order,
  };

  if (idInclude?.length) {
    pageQuery.include = idInclude;
    pageQuery.subQuery = false;
  }

  const page = await productModel.findAndCountAll(pageQuery);
  const ids = page.rows.map((product) => product.id);
  if (ids.length === 0) return { count: page.count, rows: [] };

  const hydratedProducts = await productModel.findAll({
    where: { id: { [Op.in]: ids } },
    include,
  });
  const productById = new Map(hydratedProducts.map((product) => [product.id, product]));

  return {
    count: page.count,
    rows: ids.map((id) => productById.get(id)).filter(Boolean),
  };
}

module.exports = {
  buildProductCategoryFilter,
  buildProductSearchFilter,
  buildProductSearchOrder,
  buildProductSupplierFilter,
  findPaginatedProducts,
  normalizeProductSearchQuery,
  normalizeProductSearchTokens,
};
