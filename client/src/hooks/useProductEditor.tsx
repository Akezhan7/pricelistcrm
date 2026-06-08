import React, { useCallback, useState } from 'react';
import { EditProductModal } from '../components/EditProductModal';
import { ProductSuppliersModal } from '../components/ProductSuppliersModal';
import productsApi from '../services/productsApi';
import type { Product, ProductWithPrice } from '../types';
import { toast } from '../context/ToastContext';

interface UseProductEditorOptions {
  onUpdated?: () => void;
  contextSupplierId?: number;
}

export function useProductEditor(options: UseProductEditorOptions = {}) {
  const { onUpdated, contextSupplierId } = options;

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [suppliersProduct, setSuppliersProduct] = useState<Product | null>(null);
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null);

  const loadFullProduct = useCallback(async (productId: number) => {
    return productsApi.getProductById(productId);
  }, []);

  const openEdit = useCallback(
    async (product: Product | ProductWithPrice) => {
      setLoadingProductId(product.id);
      try {
        const full = await loadFullProduct(product.id);
        setEditingProduct(full);
      } catch (err) {
        console.error('Ошибка загрузки товара:', err);
        toast.error('Не удалось загрузить данные товара');
      } finally {
        setLoadingProductId(null);
      }
    },
    [loadFullProduct]
  );

  const openSuppliers = useCallback(
    async (product: Product | ProductWithPrice) => {
      setLoadingProductId(product.id);
      try {
        const full = await loadFullProduct(product.id);
        setSuppliersProduct(full);
      } catch (err) {
        console.error('Ошибка загрузки товара:', err);
        toast.error('Не удалось загрузить данные товара');
      } finally {
        setLoadingProductId(null);
      }
    },
    [loadFullProduct]
  );

  const handleEditSuccess = useCallback(() => {
    onUpdated?.();
    setEditingProduct(null);
  }, [onUpdated]);

  const handleSuppliersSuccess = useCallback(async () => {
    onUpdated?.();
    if (suppliersProduct) {
      try {
        const full = await loadFullProduct(suppliersProduct.id);
        setSuppliersProduct(full);
      } catch (err) {
        console.error('Ошибка обновления данных товара:', err);
      }
    }
  }, [onUpdated, suppliersProduct, loadFullProduct]);

  const editorModals = (
    <>
      <EditProductModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSuccess={handleEditSuccess}
        product={editingProduct}
      />
      <ProductSuppliersModal
        isOpen={!!suppliersProduct}
        onClose={() => setSuppliersProduct(null)}
        onSuccess={handleSuppliersSuccess}
        product={suppliersProduct}
        contextSupplierId={contextSupplierId}
      />
    </>
  );

  return {
    openEdit,
    openSuppliers,
    loadingProductId,
    editorModals,
  };
}
