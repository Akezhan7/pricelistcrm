import { act, renderHook, waitFor } from '@testing-library/react';
import productsApi from '../services/productsApi';
import { useProductCatalogSearch } from './useProductCatalogSearch';

jest.mock('../services/productsApi', () => ({
  __esModule: true,
  default: { getProductsPage: jest.fn() },
}));

const product = (id: number) => ({
  id,
  name: `Товар ${id}`,
  article: `PKS${id}`,
  costPrice: 100,
  sellingPrice: 150,
  isActive: true,
  createdAt: '2026-09-08',
  updatedAt: '2026-09-08',
});

test('searches on the server and appends the next page', async () => {
  const getProductsPage = productsApi.getProductsPage as jest.Mock;
  getProductsPage
    .mockResolvedValueOnce({
      products: [product(1001)],
      pagination: { total: 2, page: 1, limit: 30, totalPages: 2 },
    })
    .mockResolvedValueOnce({
      products: [product(1002)],
      pagination: { total: 2, page: 2, limit: 30, totalPages: 2 },
    });

  const { result } = renderHook(
    ({ search }) => useProductCatalogSearch({ enabled: true, search, debounceMs: 0 }),
    { initialProps: { search: 'старый товар' } }
  );

  await waitFor(() => expect(result.current.products).toHaveLength(1));
  expect(getProductsPage).toHaveBeenNthCalledWith(1, {
    isActive: true,
    search: 'старый товар',
    page: 1,
    limit: 30,
  });

  await act(async () => result.current.loadMore());
  expect(result.current.products.map((item) => item.id)).toEqual([1001, 1002]);
});
