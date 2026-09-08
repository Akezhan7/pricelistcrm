import { useCallback, useEffect, useRef, useState } from 'react';
import productsApi from '../services/productsApi';
import type { Product } from '../types';

type ProductCatalogSearchOptions = {
  enabled: boolean;
  search: string;
  limit?: number;
  debounceMs?: number;
};

export function useProductCatalogSearch({
  enabled,
  search,
  limit = 30,
  debounceMs = 300,
}: ProductCatalogSearchOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const normalizedSearch = search.trim();

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    const requestId = ++requestIdRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const result = await productsApi.getProductsPage({
        isActive: true,
        search: normalizedSearch || undefined,
        page: nextPage,
        limit,
      });
      if (requestId !== requestIdRef.current) return;

      setProducts((current) => {
        if (!append) return result.products;
        const merged = new Map(current.map((product) => [product.id, product]));
        result.products.forEach((product) => merged.set(product.id, product));
        return Array.from(merged.values());
      });
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      if (!append) setProducts([]);
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить товары');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [limit, normalizedSearch]);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      setProducts([]);
      setPage(1);
      setTotalPages(1);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => loadPage(1, false), debounceMs);
    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [debounceMs, enabled, loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || page >= totalPages) return;
    await loadPage(page + 1, true);
  }, [loadPage, loading, loadingMore, page, totalPages]);

  return {
    products,
    loading,
    loadingMore,
    error,
    hasMore: page < totalPages,
    loadMore,
  };
}
