import React, { useMemo, useState, useEffect } from 'react';

import { Product, ProductLifecycleStatus } from '../types';

import {
  Plus,
  Edit,
  Trash2,
  Users,
  Settings,
  TrendingUp,
  History,
  Package,
  Search,
  X,
  UserPlus,
  CheckSquare,
  Square,
} from 'lucide-react';

import { Button, EmptyState, IconButton, Input, Pagination, Select } from './ui';

import { ProductListItem } from './ProductListItem';

import { CreateProductModal } from './CreateProductModal';

import { CreateProductDraftModal } from './CreateProductDraftModal';

import { AssignDesignerModal } from './AssignDesignerModal';

import { DeleteConfirmModal } from './DeleteConfirmModal';

import { useProductEditor } from '../hooks/useProductEditor';

import { ProductVariationsModal } from './ProductVariationsModal';

import { PriceHistoryModal } from './PriceHistoryModal';
import { ProductHistoryModal } from './ProductHistoryModal';

import api from '../utils/api';
import { PRODUCT_LIFECYCLE_FILTERS } from '../constants/productLifecycle';

type ProductListProps = {
  products: Product[];
  searchQuery: string;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onRefresh: () => void;
  canEdit: boolean;
  canCreateDraft?: boolean;
  canAssignDesigner?: boolean;
  lifecycleStatusFilter?: ProductLifecycleStatus | '';
  onLifecycleStatusFilterChange?: (status: ProductLifecycleStatus | '') => void;
};

export const ProductList: React.FC<ProductListProps> = ({
  products,
  searchQuery,
  selectedProduct,
  onSelectProduct,
  onRefresh,
  canEdit,
  canCreateDraft = false,
  canAssignDesigner = false,
  lifecycleStatusFilter = '',
  onLifecycleStatusFilterChange,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateDraftModalOpen, setIsCreateDraftModalOpen] = useState(false);
  const [isAssignDesignerModalOpen, setIsAssignDesignerModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productForVariations, setProductForVariations] = useState<Product | null>(null);

  const { openEdit, openSuppliers, editorModals } = useProductEditor({
    onUpdated: onRefresh,
  });
  const [productForPriceHistory, setProductForPriceHistory] = useState<Product | null>(null);
  const [productForHistory, setProductForHistory] = useState<Product | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, localSearchQuery]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.article.toLowerCase().includes(query)
      );
    }

    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.article.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery, localSearchQuery]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const bulkAssignEnabled = canAssignDesigner && lifecycleStatusFilter === 'new';

  const selectableProductsOnPage = useMemo(
    () =>
      bulkAssignEnabled
        ? paginatedProducts.filter((product) => product.lifecycleStatus === 'new')
        : [],
    [bulkAssignEnabled, paginatedProducts]
  );

  const selectedProductIdsArray = useMemo(
    () => Array.from(selectedProductIds),
    [selectedProductIds]
  );

  const allSelectableOnPageSelected =
    selectableProductsOnPage.length > 0 &&
    selectableProductsOnPage.every((product) => selectedProductIds.has(product.id));

  useEffect(() => {
    if (!bulkAssignEnabled) {
      setSelectedProductIds(new Set());
      return;
    }

    const existingIds = new Set(products.map((product) => product.id));
    setSelectedProductIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => existingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [bulkAssignEnabled, products]);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      onRefresh();

      if (selectedProduct?.id === productToDelete.id) {
        onSelectProduct(null);
      }

      setProductToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDraftCreated = () => {
    if (onLifecycleStatusFilterChange) {
      onLifecycleStatusFilterChange('new');
    }
    onRefresh();
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const togglePageSelection = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (allSelectableOnPageSelected) {
        selectableProductsOnPage.forEach((product) => next.delete(product.id));
      } else {
        selectableProductsOnPage.forEach((product) => next.add(product.id));
      }
      return next;
    });
  };

  const handleDesignerAssigned = () => {
    setSelectedProductIds(new Set());
    onRefresh();
  };

  const emptyTitle =
    searchQuery || localSearchQuery ? 'Товары не найдены' : 'Товары не добавлены';

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
      <div className="px-4 py-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-page/95 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            leftIcon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
            fullWidth
            className="sm:w-auto sm:shrink-0"
          >
            Добавить товар
          </Button>
        )}
        {canCreateDraft && (
          <Button
            type="button"
            variant="secondary"
            leftIcon={Plus}
            onClick={() => setIsCreateDraftModalOpen(true)}
            fullWidth
            className="sm:w-auto sm:shrink-0"
          >
            Быстрый черновик
          </Button>
        )}
        {onLifecycleStatusFilterChange && (
          <Select
            value={lifecycleStatusFilter}
            onChange={(e) =>
              onLifecycleStatusFilterChange(e.target.value as ProductLifecycleStatus | '')
            }
            className="sm:max-w-48"
            aria-label="Фильтр по этапу товара"
          >
            {PRODUCT_LIFECYCLE_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
        <div className="relative flex-1 min-w-0 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none z-10"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="Поиск по названию или артикулу..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-brand-white border-border-subtle shadow-sm focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
          />
          {localSearchQuery && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <IconButton
                icon={X}
                title="Очистить поиск"
                size="md"
                variant="ghost"
                onClick={() => setLocalSearchQuery('')}
              />
            </div>
          )}
        </div>
      </div>

      {bulkAssignEnabled && (
        <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-muted/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <label className="inline-flex items-center gap-2 text-body text-brand-black cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={allSelectableOnPageSelected}
              disabled={selectableProductsOnPage.length === 0}
              onChange={togglePageSelection}
            />
            {allSelectableOnPageSelected ? (
              <CheckSquare className="h-4 w-4 text-brand-yellow-dark" aria-hidden />
            ) : (
              <Square className="h-4 w-4 text-text-muted" aria-hidden />
            )}
            <span>
              {selectedProductIds.size > 0
                ? `Выбрано ${selectedProductIds.size}`
                : 'Выбрать товары на странице'}
            </span>
          </label>
          <div className="flex items-center gap-2">
            {selectedProductIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProductIds(new Set())}
              >
                Сбросить
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={UserPlus}
              disabled={selectedProductIds.size === 0}
              onClick={() => setIsAssignDesignerModalOpen(true)}
            >
              Передать дизайнеру
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 lg:p-4" style={{ minHeight: 0 }}>
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={emptyTitle}
            description={
              canEdit && !searchQuery && !localSearchQuery
                ? 'Добавьте первый товар, чтобы начать работу'
                : undefined
            }
            action={
              canEdit && !searchQuery && !localSearchQuery ? (
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={Plus}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Добавить товар
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {paginatedProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                selected={selectedProduct?.id === product.id}
                onClick={() =>
                  onSelectProduct(selectedProduct?.id === product.id ? null : product)
                }
                children={
                  bulkAssignEnabled && product.lifecycleStatus === 'new' ? (
                    <label
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-inset cursor-pointer"
                      title="Выбрать товар"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                      />
                      {selectedProductIds.has(product.id) ? (
                        <CheckSquare className="h-4 w-4 text-brand-yellow-dark" aria-hidden />
                      ) : (
                        <Square className="h-4 w-4 text-text-muted" aria-hidden />
                      )}
                    </label>
                  ) : undefined
                }
                footer={
                  canEdit || product.permissions?.allowedActions.includes('view_product_history') ? (
                    <div className="flex justify-end">
                      <div className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-inset/60 p-1">
                        {product.permissions?.allowedActions.includes('view_product_history') && (
                          <IconButton
                            icon={History}
                            title="История товара"
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductForHistory(product);
                            }}
                          />
                        )}
                        {canEdit && (
                          <IconButton
                            icon={TrendingUp}
                            title="История цен"
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductForPriceHistory(product);
                            }}
                          />
                        )}
                        {product.permissions?.allowedActions.includes('manage_product_suppliers') && (
                          <IconButton
                            icon={Users}
                            title="Управление поставщиками"
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSuppliers(product);
                            }}
                          />
                        )}
                        {product.permissions?.allowedActions.includes('manage_product_variations') && (
                          <IconButton
                            icon={Settings}
                            title="Управление вариациями"
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductForVariations(product);
                            }}
                          />
                        )}
                        {product.permissions?.allowedActions.includes('edit_product_card') && (
                          <IconButton
                            icon={Edit}
                            title="Редактировать товар"
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(product);
                            }}
                          />
                        )}
                        {product.permissions?.allowedActions.includes('delete_product') && (
                          <IconButton
                            icon={Trash2}
                            title="Удалить товар"
                            size="md"
                            variant="danger"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredProducts.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        variant="numbered"
      />

      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onRefresh}
      />

      <CreateProductDraftModal
        isOpen={isCreateDraftModalOpen}
        onClose={() => setIsCreateDraftModalOpen(false)}
        onSuccess={handleDraftCreated}
      />

      <AssignDesignerModal
        isOpen={isAssignDesignerModalOpen}
        onClose={() => setIsAssignDesignerModalOpen(false)}
        productIds={selectedProductIdsArray}
        selectedCount={selectedProductIds.size}
        onSuccess={handleDesignerAssigned}
      />

      {editorModals}

      <DeleteConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        loading={isDeleting}
        title="Удалить товар"
        message="Вы уверены, что хотите удалить этот товар?"
        itemName={productToDelete?.name}
      />

      <ProductVariationsModal
        isOpen={!!productForVariations}
        onClose={() => setProductForVariations(null)}
        onSuccess={() => {
          onRefresh();
          if (selectedProduct?.id === productForVariations?.id) {
            onSelectProduct(null);
          }
        }}
        product={productForVariations}
      />

      <PriceHistoryModal
        isOpen={!!productForPriceHistory}
        onClose={() => setProductForPriceHistory(null)}
        productId={productForPriceHistory?.id || 0}
        productName={productForPriceHistory?.name || ''}
      />

      <ProductHistoryModal
        product={productForHistory}
        onClose={() => setProductForHistory(null)}
      />
    </div>
  );
};
