import {
  buildProductsListSearchParams,
  parseCategoryIdParam,
} from './productFilters';

describe('product filters', () => {
  it('builds a products request that combines category and lifecycle filters', () => {
    expect(buildProductsListSearchParams({
      limit: 1000,
      categoryId: 17,
      lifecycleStatus: 'content_created',
      supplierStatus: 'without',
    }).toString()).toBe(
      'limit=1000&categoryId=17&lifecycleStatus=content_created&supplierStatus=without'
    );
  });

  it('accepts only positive integer category ids from the URL', () => {
    expect(parseCategoryIdParam('17')).toBe(17);
    expect(parseCategoryIdParam('0')).toBeNull();
    expect(parseCategoryIdParam('wrong')).toBeNull();
  });
});
