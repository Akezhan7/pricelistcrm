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
};
