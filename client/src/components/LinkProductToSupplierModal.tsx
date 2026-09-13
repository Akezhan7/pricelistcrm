import React, { useEffect, useState } from 'react';
import { Search, Image as ImageIcon } from 'lucide-react';
import type { Product, Supplier } from '../types';
import productsApi from '../services/productsApi';
import getImageUrl from '../utils/image';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { Spinner } from './ui/Spinner';
import { Input } from './ui/Input';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить из каталога"
      size="lg"
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel="Привязать"
          submitLoading={submitting}
          submitDisabled={submitting || !selectedProduct}
          onSubmit={() => {
            const form = document.getElementById('link-product-form') as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          submitType="button"
        />
      }
    >
      <p className="text-sm text-text-muted -mt-2 mb-4">Поставщик: {supplier.name}</p>

      <form id="link-product-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Название, артикул или код товара..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-white border border-border-input rounded-lg shadow-sm hover:border-text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-yellow/20 focus:border-brand-yellow text-sm transition-colors"
            autoFocus
          />
        </div>

        <div className="border border-border rounded-card overflow-hidden max-h-56 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" color="brand" useLucide />
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              {debouncedSearch
                ? 'Товары не найдены'
                : 'Все товары уже привязаны к этому поставщику'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {products.map((product) => {
                const isSelected = selectedProduct?.id === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className={`w-full p-3 text-left flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-brand-yellow/10' : 'hover:bg-surface-muted'
                    }`}
                  >
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image) || undefined}
                        alt=""
                        className="h-10 w-10 rounded object-cover border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-surface-muted rounded flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-brand-black truncate">
                        {product.name}
                      </div>
                      <div className="text-xs text-text-muted">{product.article}</div>
                      <div className="text-xs text-text-muted mt-0.5">
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
          <div className="bg-surface-muted border border-border rounded-card p-3 space-y-3">
            <div className="text-sm font-medium text-brand-black">{selectedProduct.name}</div>
            <Input
              label="Цена у поставщика, ₸ *"
              type="number"
              min={0}
              step="0.01"
              required
              value={supplierPrice}
              onChange={(e) => setSupplierPrice(e.target.value)}
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
