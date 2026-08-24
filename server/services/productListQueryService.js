const { Op } = require('sequelize');

const PRODUCT_SEARCH_FIELDS = Object.freeze([
  'name',
  'article',
  'internalName',
  'kaspiName',
  'kaspiArticle',
]);

function normalizeProductSearchTokens(search) {
  if (typeof search !== 'string') return [];
  return Array.from(new Set(
    search.trim().toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean)
  ));
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

module.exports = {
  buildProductCategoryFilter,
  buildProductSearchFilter,
  normalizeProductSearchTokens,
};
