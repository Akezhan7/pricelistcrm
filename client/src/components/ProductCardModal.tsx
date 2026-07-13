import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  FileText,
  History,
  Image as ImageIcon,
  Package,
  Save,
  Store,
  Truck,
} from 'lucide-react';
import type { Category, Product, SupplierWithPrice } from '../types';
import api from '../utils/api';
import categoryApi from '../services/categoryApi';
import productsApi from '../services/productsApi';
import getImageUrl from '../utils/image';
import { cn } from '../utils/cn';
import { formatPriceKZT } from '../utils/format';
import { getProductLifecycleLabel } from '../constants/productLifecycle';
import { toast } from '../context/ToastContext';
import { ProductFormFields } from './forms/ProductFormFields';
import type { ProductFormData } from './forms/ProductFormFields';
import { ProductMarketplacePanel } from './ProductMarketplacePanel';
import { ProductAssetsPanel } from './ProductAssetsPanel';
import { ProductWarehousePanel } from './ProductWarehousePanel';
import { ProductActionTimeline } from './ProductActionTimeline';
import { ProductSuppliersModal } from './ProductSuppliersModal';
import { Alert, Badge, Button, Modal, Spinner } from './ui';

type ProductCardModalProps = {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
};

type ProductCardTab =
  | 'main'
  | 'marketplaces'
  | 'assets'
  | 'suppliers'
  | 'warehouse'
  | 'history';

const tabs: Array<{ id: ProductCardTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'main', label: 'Основное', icon: FileText },
  { id: 'marketplaces', label: 'Маркетплейсы', icon: Store },
  { id: 'assets', label: 'Материалы', icon: ImageIcon },
  { id: 'suppliers', label: 'Поставщики', icon: Truck },
  { id: 'warehouse', label: 'Склад', icon: Boxes },
  { id: 'history', label: 'История', icon: History },
];

function isLegacyCatalogProduct(product: Product) {
  return product.lifecycleStatus === 'in_sale' && !product.lifecycleStartedAt;
}

function formDataFromProduct(product: Product): ProductFormData {
  return {
    name: product.name || '',
    article: product.article || '',
    internalName: product.internalName || '',
    kaspiName: product.kaspiName || '',
    kaspiArticle: product.kaspiArticle || '',
    costPrice: String(product.costPrice ?? ''),
    sellingPrice: String(product.sellingPrice ?? ''),
    currentStock: String(product.currentStock ?? 0),
    minStock: String(product.minStock ?? 0),
    categoryId: product.categoryId ? String(product.categoryId) : '',
    description: product.description || '',
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

function ProductSummary({ product }: { product: Product }) {
  const lifecycleLabel = isLegacyCatalogProduct(product)
    ? 'Старый каталог'
    : getProductLifecycleLabel(product.lifecycleStatus);

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border-subtle bg-surface-page px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5">
      <div className="h-16 w-16 overflow-hidden rounded-xl border border-border-subtle bg-surface-inset">
        {product.image ? (
          <img
            src={getImageUrl(product.image) || undefined}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(event) => {
              const image = event.currentTarget;
              image.onerror = null;
              image.src = '/placeholder.svg';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-6 w-6 text-text-muted" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-section-title text-brand-black">{product.name}</h3>
          {lifecycleLabel && <Badge variant="outline">{lifecycleLabel}</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
          <span>{product.article}</span>
          {product.category?.name && <span>{product.category.name}</span>}
          {product.responsibility?.roleLabel && <span>{product.responsibility.roleLabel}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-right sm:min-w-48">
        <div>
          <p className="text-caption text-text-muted">Себестоимость</p>
          <p className="text-body-medium text-brand-black">{formatPriceKZT(product.costPrice)}</p>
        </div>
        <div>
          <p className="text-caption text-text-muted">Продажа</p>
          <p className="text-body-medium text-brand-black">{formatPriceKZT(product.sellingPrice)}</p>
        </div>
      </div>
    </div>
  );
}

function MainProductTab({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: () => Promise<void>;
}) {
  const [formData, setFormData] = useState<ProductFormData>(() => formDataFromProduct(product));
  const [image, setImage] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = Boolean(product.permissions?.allowedActions.includes('edit_product_card'));

  useEffect(() => {
    setFormData(formDataFromProduct(product));
    setImage(null);
    setError('');
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    categoryApi.getCategories({ isActive: true })
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch((loadError) => {
        console.error('Ошибка загрузки категорий:', loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setError('');
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('article', formData.article);
      data.append('internalName', formData.internalName);
      data.append('costPrice', formData.costPrice);
      data.append('sellingPrice', formData.sellingPrice);
      data.append('currentStock', formData.currentStock);
      data.append('minStock', formData.minStock);
      if (formData.categoryId) data.append('categoryId', formData.categoryId);
      data.append('description', formData.description);
      if (image) data.append('image', image);

      await api.put(`/products/${product.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Товар обновлён');
      await onSaved();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось сохранить товар'));
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <Alert variant="info">У вас нет прав на редактирование основной карточки товара.</Alert>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadonlyField label="Внутреннее название" value={product.internalName || product.name} />
          <ReadonlyField label="Артикул" value={product.article} />
          <ReadonlyField label="Категория" value={product.category?.name || 'Без категории'} />
          <ReadonlyField label="Остаток" value={`${product.currentStock ?? 0} шт.`} />
          <ReadonlyField label="Себестоимость" value={formatPriceKZT(product.costPrice)} />
          <ReadonlyField label="Цена продажи" value={formatPriceKZT(product.sellingPrice)} />
        </div>
        {product.description && (
          <ReadonlyField label="Описание" value={product.description} multiline />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <ProductFormFields
        data={formData}
        onChange={setFormData}
        categories={categories}
        image={image}
        onImageChange={setImage}
        currentImageUrl={product.image || null}
        mode="edit"
      />
      <div className="flex justify-end border-t border-border-subtle pt-4">
        <Button type="submit" leftIcon={Save} loading={saving} disabled={saving}>
          Сохранить основное
        </Button>
      </div>
    </form>
  );
}

function ReadonlyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-muted px-3 py-2">
      <p className="text-caption text-text-muted">{label}</p>
      <p className={cn('mt-1 text-body text-brand-black', multiline && 'whitespace-pre-wrap')}>
        {value || '—'}
      </p>
    </div>
  );
}

function SuppliersTab({
  product,
  onChanged,
}: {
  product: Product;
  onChanged: () => Promise<void>;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const suppliers = product.suppliers || [];
  const canManage = Boolean(product.permissions?.allowedActions.includes('manage_product_suppliers'));

  const handleSuccess = async () => {
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-body-medium text-brand-black">Поставщики товара</p>
          <p className="text-caption text-text-muted">
            Здесь видно, у кого закупается товар, цену поставщика и доступность.
          </p>
        </div>
        {canManage && (
          <Button type="button" variant="secondary" leftIcon={Truck} onClick={() => setManageOpen(true)}>
            Управлять поставщиками
          </Button>
        )}
      </div>

      {suppliers.length === 0 ? (
        <Alert variant="info">
          Поставщики пока не привязаны. {canManage ? 'Добавьте поставщика через кнопку управления.' : ''}
        </Alert>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem_6rem] gap-3 border-b border-border-subtle bg-surface-muted px-3 py-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
            <span>Поставщик</span>
            <span className="text-right">Цена</span>
            <span className="text-right">Остаток</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {suppliers.map((supplier) => (
              <SupplierRow key={supplier.id} supplier={supplier} />
            ))}
          </div>
        </div>
      )}

      <ProductSuppliersModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        onSuccess={handleSuccess}
        product={product}
      />
    </div>
  );
}

function SupplierRow({ supplier }: { supplier: SupplierWithPrice }) {
  const link = supplier.ProductSupplier;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8rem_6rem] gap-3 px-3 py-3 text-body">
      <div className="min-w-0">
        <p className="truncate text-body-medium text-brand-black">{supplier.name}</p>
        <p className="mt-0.5 truncate text-caption text-text-muted">
          {link.notes || (link.isAvailable ? 'Доступен' : 'Недоступен')}
        </p>
      </div>
      <div className="text-right tabular-nums text-brand-black">
        {formatPriceKZT(link.supplierPrice)}
      </div>
      <div className="text-right tabular-nums text-text-muted">
        {link.quantity ?? 0}
      </div>
    </div>
  );
}

export const ProductCardModal: React.FC<ProductCardModalProps> = ({
  product,
  isOpen,
  onClose,
  onChanged,
}) => {
  const [activeTab, setActiveTab] = useState<ProductCardTab>('main');
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const productId = product?.id;

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const loaded = await productsApi.getProductById(productId);
      setFullProduct(loaded);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить карточку товара'));
      setFullProduct(product);
    } finally {
      setLoading(false);
    }
  }, [productId, product]);

  useEffect(() => {
    if (!isOpen || !productId) {
      setFullProduct(null);
      setError('');
      setActiveTab('main');
      return;
    }
    setFullProduct(product);
    setActiveTab('main');
    loadProduct();
  }, [isOpen, productId, product, loadProduct]);

  const displayProduct = fullProduct || product;

  const handleChanged = useCallback(async () => {
    await loadProduct();
    onChanged();
  }, [loadProduct, onChanged]);

  const tabContent = useMemo(() => {
    if (!displayProduct) return null;

    switch (activeTab) {
      case 'main':
        return <MainProductTab product={displayProduct} onSaved={handleChanged} />;
      case 'marketplaces':
        return (
          <ProductMarketplacePanel
            product={displayProduct}
            onChanged={handleChanged}
            onSaved={handleChanged}
          />
        );
      case 'assets':
        return (
          <ProductAssetsPanel
            productId={displayProduct.id}
            productName={displayProduct.name}
            canEdit={Boolean(displayProduct.permissions?.allowedActions.includes('manage_assets'))}
            canSubmitContent={Boolean(displayProduct.permissions?.allowedActions.includes('submit_content'))}
            onContentSubmitted={handleChanged}
            onAssetsChanged={() => undefined}
            showProductHeader={false}
          />
        );
      case 'suppliers':
        return <SuppliersTab product={displayProduct} onChanged={handleChanged} />;
      case 'warehouse':
        return <ProductWarehousePanel product={displayProduct} onChanged={handleChanged} />;
      case 'history':
        return <ProductActionTimeline productId={displayProduct.id} />;
      default:
        return null;
    }
  }, [activeTab, displayProduct, handleChanged]);

  return (
    <Modal
      isOpen={isOpen && Boolean(product)}
      onClose={onClose}
      title="Карточка товара"
      size="full"
      className="sm:max-w-6xl"
    >
      {!displayProduct ? (
        <div className="flex min-h-72 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="mx-[-1rem] my-[-1rem] flex min-h-[70vh] flex-col sm:mx-[-1.25rem] sm:my-[-1.25rem]">
          <ProductSummary product={displayProduct} />

          <div className="border-b border-border-subtle bg-brand-white px-4 sm:px-5">
            <div className="flex gap-1 overflow-x-auto py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-body-medium transition-colors',
                      selected
                        ? 'bg-brand-yellow text-brand-black'
                        : 'text-text-muted hover:bg-surface-muted hover:text-brand-black'
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-brand-white p-4 sm:p-5">
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            {loading && !fullProduct ? (
              <div className="flex min-h-72 items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              tabContent
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
