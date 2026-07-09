import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ProductList } from '../components/ProductList';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Product, ProductLifecycleStatus } from '../types';
import api from '../utils/api';
import { Package, RefreshCw } from 'lucide-react';
import { IconButton, Spinner } from '../components/ui';

const API_LIST_LIMIT = 1000;

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useUI();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lifecycleStatusFilter, setLifecycleStatusFilter] = useState<ProductLifecycleStatus | ''>('');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(API_LIST_LIMIT) });
      if (lifecycleStatusFilter) {
        params.set('lifecycleStatus', lifecycleStatusFilter);
      }

      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data.data.products);
      setTotalProducts(res.data.data.pagination?.total || res.data.data.products.length);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
    }
  }, [lifecycleStatusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const countLabel =
    totalProducts === 1 ? 'позиция' : totalProducts < 5 ? 'позиции' : 'позиций';

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Spinner size="lg" color="brand" />
          <p className="text-text-muted">Загрузка товаров...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="w-full h-full flex flex-col min-h-0">
        {/* Mobile sticky page header */}
        <div className="md:hidden sticky top-0 z-10 -mx-4 px-4 py-3 mb-3 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15">
                <Package className="h-5 w-5 text-brand-yellow-dark" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-section-title font-bold tracking-tight text-brand-black truncate">
                  Товары
                </h1>
                <p className="text-caption text-text-muted mt-0.5">
                  {totalProducts} {countLabel}
                </p>
              </div>
            </div>
            <IconButton
              icon={RefreshCw}
              title="Обновить"
              size="md"
              variant="ghost"
              onClick={fetchProducts}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-brand-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
          <div className="hidden md:flex px-5 py-4 border-b border-border-subtle bg-surface-muted flex-row items-center justify-between gap-3 shrink-0">
            <h1 className="text-h1 font-bold tracking-tight text-brand-black flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-yellow shrink-0" aria-hidden />
              <span>Товары</span>
              <span className="text-body font-normal text-text-muted tabular-nums">
                ({totalProducts})
              </span>
            </h1>
            <IconButton
              icon={RefreshCw}
              title="Обновить"
              size="md"
              variant="ghost"
              onClick={fetchProducts}
            />
          </div>
          <ProductList
            products={products}
            searchQuery={searchQuery}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            onRefresh={fetchProducts}
            canEdit={user?.role === 'admin' || user?.role === 'purchase_manager'}
            canCreateDraft={user?.role === 'admin'}
            canAssignDesigner={user?.role === 'admin'}
            lifecycleStatusFilter={lifecycleStatusFilter}
            onLifecycleStatusFilterChange={setLifecycleStatusFilter}
          />
        </div>
      </div>
    </Layout>
  );
};
