import {
  buildProductsListSearchParams,
  parseCategoryIdParam,
} from './productFilters';

describe('product filters', () => {
  it('builds a products request that combines category and lifecycle filters', () => {
    expect(buildProductsListSearchParams({
      limit: 30,
      page: 4,
      search: '  малярный скотч  ',
      categoryId: 17,
      lifecycleStatus: 'content_created',
      supplierStatus: 'without',
    }).toString()).toBe(
      'limit=30&page=4&search=%D0%BC%D0%B0%D0%BB%D1%8F%D1%80%D0%BD%D1%8B%D0%B9+%D1%81%D0%BA%D0%BE%D1%82%D1%87&categoryId=17&lifecycleStatus=content_created&supplierStatus=without'
    );
  });

  it('accepts only positive integer category ids from the URL', () => {
    expect(parseCategoryIdParam('17')).toBe(17);
    expect(parseCategoryIdParam('0')).toBeNull();
    expect(parseCategoryIdParam('wrong')).toBeNull();
  });
});
