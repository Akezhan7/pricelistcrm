import { useCallback, useEffect, useState } from 'react';
import suppliersApi from '../services/suppliersApi';
import type { ProductWithPrice } from '../types';

export function useSupplierProducts(supplierId: number | null | undefined) {
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!supplierId) {
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const supplier = await suppliersApi.getSupplierById(supplierId);
        if (!cancelled) {
          setProducts((supplier.products || []) as ProductWithPrice[]);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Ошибка загрузки товаров поставщика';
          setError(message);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supplierId, refreshKey]);

  return { products, loading, error, refetch };
}
