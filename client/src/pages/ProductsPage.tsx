import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ProductList } from '../components/ProductList';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Product } from '../types';
import api from '../utils/api';
import { RefreshCw } from 'lucide-react';

const API_LIST_LIMIT = 1000;

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useUI();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products?limit=${API_LIST_LIMIT}`);
      setProducts(res.data.data.products);
      setTotalProducts(res.data.data.pagination?.total || res.data.data.products.length);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка товаров...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm" style={{ minHeight: 0 }}>
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Товары ({totalProducts})</h1>
          <button
            onClick={fetchProducts}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <ProductList
          products={products}
          searchQuery={searchQuery}
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
          onRefresh={fetchProducts}
          canEdit={user?.role === 'admin' || user?.role === 'purchase_manager'}
        />
      </div>
    </Layout>
  );
};
