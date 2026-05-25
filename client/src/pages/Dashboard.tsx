import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProductList } from '../components/ProductList';
import { SupplierCards } from '../components/SupplierCards';
import { SupplierProductsPanel } from '../components/SupplierProductsPanel';
import { BaysideMap } from '../components/BaysideMap';
import { Layout } from '../components/Layout';
import { Product, Supplier } from '../types';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const API_LIST_LIMIT = 1000;

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, suppliersRes] = await Promise.all([
          api.get(`/products?limit=${API_LIST_LIMIT}`),
          api.get(`/suppliers?limit=${API_LIST_LIMIT}`)
        ]);

        setProducts(productsRes.data.data.products);
        setSuppliers(suppliersRes.data.data.suppliers);
        setTotalProducts(productsRes.data.data.pagination?.total || productsRes.data.data.products.length);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshData = async () => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        api.get(`/products?limit=${API_LIST_LIMIT}`),
        api.get(`/suppliers?limit=${API_LIST_LIMIT}`)
      ]);

      setProducts(productsRes.data.data.products);
      setSuppliers(suppliersRes.data.data.suppliers);
      setTotalProducts(productsRes.data.data.pagination?.total || productsRes.data.data.products.length);
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
    }
  };

  const filteredSuppliers = selectedProduct
    ? suppliers.filter(supplier => 
        supplier.products?.some(p => p.id === selectedProduct.id)
      ).sort((a, b) => {
        const priceA = a.products?.find(p => p.id === selectedProduct.id)?.ProductSupplier.supplierPrice || 0;
        const priceB = b.products?.find(p => p.id === selectedProduct.id)?.ProductSupplier.supplierPrice || 0;
        return priceA - priceB;
      })
    : suppliers;

  // При обновлении списка поставщиков подставляем актуальные данные в выбранного
  useEffect(() => {
    if (selectedSupplier) {
      const fresh = suppliers.find((s) => s.id === selectedSupplier.id);
      if (fresh) setSelectedSupplier(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (showMap) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowMap(false)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад к товарам
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">Карта Bayside</h1>
            </div>
            <button
              onClick={refreshData}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить
            </button>
          </div>
          <BaysideMap suppliers={suppliers} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight={true}>
      <div className="flex gap-4 h-full">
        <div className="w-1/3 border border-gray-200 bg-white rounded-lg flex flex-col shadow-sm" style={{ minHeight: 0 }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Товары ({totalProducts})
              </h2>
              <button
                onClick={refreshData}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Обновить товары"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          {selectedProduct && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Показать всех поставщиков
              </button>
            </div>
          )}
          <ProductList
            products={products}
            searchQuery={searchQuery}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            onRefresh={refreshData}
            canEdit={user?.role === 'admin' || user?.role === 'purchase_manager'}
          />
        </div>

        <div className="flex-1 border border-gray-200 bg-white rounded-lg flex flex-col shadow-sm" style={{ minHeight: 0, minWidth: 0 }}>
          <div className="p-3 lg:p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900">
                {selectedSupplier ? (
                  <>
                    Товары поставщика: <span className="text-yellow-600">{selectedSupplier.name}</span>
                  </>
                ) : selectedProduct ? (
                  <>
                    Поставщики товара: <span className="text-blue-600">{selectedProduct.name}</span>
                  </>
                ) : (
                  <>Все поставщики</>
                )}
              </h2>
              {selectedSupplier && (
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-sm text-yellow-700 hover:text-yellow-800 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  К списку поставщиков
                </button>
              )}
            </div>
          </div>
          {selectedSupplier ? (
            <SupplierProductsPanel
              supplier={selectedSupplier}
              canCreate={user?.role === 'admin' || user?.role === 'purchase_manager'}
              onOrderSuccess={refreshData}
            />
          ) : (
            <SupplierCards
              suppliers={filteredSuppliers}
              selectedProduct={selectedProduct}
              onRefresh={refreshData}
              canEdit={user?.role === 'admin' || user?.role === 'purchase_manager'}
              onSelectSupplier={(s) => setSelectedSupplier(s)}
              selectedSupplierId={selectedSupplier ? (selectedSupplier as Supplier).id : null}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};
