import React, { useEffect, useState } from 'react';
import { X, Search, Loader2, Link2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import type { Product, Supplier } from '../types';
import productsApi from '../services/productsApi';
import getImageUrl from '../utils/image';

interface LinkProductToSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier;
}

const formatPrice = (n: number | string) =>
  new Intl.NumberFormat('ru-RU').format(Number(n) || 0);

export const LinkProductToSupplierModal: React.FC<LinkProductToSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [supplierPrice, setSupplierPrice] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setDebouncedSearch('');
      setProducts([]);
      setSelectedProduct(null);
      setSupplierPrice('');
      setError('');
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await productsApi.getProducts({
          search: debouncedSearch || undefined,
          excludeSupplierId: supplier.id,
          limit: 30,
        });
        if (!cancelled) setProducts(list);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки товаров');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, debouncedSearch, supplier.id]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSupplierPrice(String(product.costPrice ?? ''));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Выберите товар из списка');
      return;
    }

    const price = parseFloat(supplierPrice);
    if (Number.isNaN(price) || price < 0) {
      setError('Укажите корректную цену у поставщика');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await productsApi.linkProductToSupplier(selectedProduct.id, {
        supplierId: supplier.id,
        supplierPrice: price,
        quantity: 0,
        isAvailable: true,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Ошибка привязки товара');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Добавить из каталога</h2>
            <p className="text-sm text-gray-500 mt-0.5">Поставщик: {supplier.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или артикулу..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                autoFocus
              />
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Поиск...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  {debouncedSearch
                    ? 'Товары не найдены'
                    : 'Все товары уже привязаны к этому поставщику'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {products.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className={`w-full p-3 text-left flex items-start gap-3 transition-colors ${
                          isSelected ? 'bg-yellow-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image) || undefined}
                            alt=""
                            className="h-10 w-10 rounded object-cover border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500">{product.article}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            себ-ть {formatPrice(product.costPrice)} ₸
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">{selectedProduct.name}</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена у поставщика, ₸ *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="input-field"
                    value={supplierPrice}
                    onChange={(e) => setSupplierPrice(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={submitting || !selectedProduct}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Привязать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
