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
  Store,
  Rocket,
} from 'lucide-react';

import { Button, EmptyState, IconButton, Input, Modal, Pagination, Select } from './ui';

import { ProductListItem } from './ProductListItem';
import { ProductRowActions, type ProductRowAction } from './ProductRowActions';

import { CreateProductModal } from './CreateProductModal';

import { CreateProductDraftModal } from './CreateProductDraftModal';

import { AssignDesignerModal } from './AssignDesignerModal';

import { DeleteConfirmModal } from './DeleteConfirmModal';

import { useProductEditor } from '../hooks/useProductEditor';

import { ProductVariationsModal } from './ProductVariationsModal';

import { PriceHistoryModal } from './PriceHistoryModal';
import { ProductHistoryModal } from './ProductHistoryModal';
import { ProductMarketplacePanel } from './ProductMarketplacePanel';
import { StartProductLifecycleModal } from './StartProductLifecycleModal';
import { ProductCardModal } from './ProductCardModal';

import api from '../utils/api';
import { PRODUCT_LIFECYCLE_FILTERS } from '../constants/productLifecycle';
import { cn } from '../utils/cn';
import {
  canStartProductLifecycle,
  getBulkSelectableProductIds,
  type ProductBulkActionMode,
} from '../utils/productBulkSelection';
import { filterProductsBySearch } from '../utils/productSearch';

type ProductListProps = {
  products: Product[];
  searchQuery: string;
  onSearchQueryChange?: (query: string) => void;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onRefresh: () => void;
  canEdit: boolean;
  canCreateDraft?: boolean;
  canAssignDesigner?: boolean;
  lifecycleStatusFilter?: ProductLifecycleStatus | '';
  onLifecycleStatusFilterChange?: (status: ProductLifecycleStatus | '') => void;
  supplierStatusFilter?: 'without' | '';
  onSupplierStatusFilterChange?: (status: 'without' | '') => void;
  pageResetKey?: string | number;
  currentPage?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onSelectAllEligible?: (mode: ProductBulkActionMode) => Promise<number[]>;
  compact?: boolean;
  denseCatalog?: boolean;
  className?: string;
};

export const ProductList: React.FC<ProductListProps> = ({
  products,
  searchQuery,
  onSearchQueryChange,
  selectedProduct,
  onSelectProduct,
  onRefresh,
  canEdit,
  canCreateDraft = false,
  canAssignDesigner = false,
  lifecycleStatusFilter = '',
  onLifecycleStatusFilterChange,
  supplierStatusFilter = '',
  onSupplierStatusFilterChange,
  pageResetKey,
  currentPage: controlledCurrentPage,
  totalItems: controlledTotalItems,
  itemsPerPage = 30,
  onPageChange,
  onSelectAllEligible,
  compact = false,
  denseCatalog = false,
  className,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateDraftModalOpen, setIsCreateDraftModalOpen] = useState(false);
  const [isAssignDesignerModalOpen, setIsAssignDesignerModalOpen] = useState(false);
  const [isBulkLifecycleModalOpen, setIsBulkLifecycleModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productForVariations, setProductForVariations] = useState<Product | null>(null);
  const [productForMarketplace, setProductForMarketplace] = useState<Product | null>(null);
  const [productForLifecycleStart, setProductForLifecycleStart] = useState<Product | null>(null);
  const [productForCard, setProductForCard] = useState<Product | null>(null);

  const { openSuppliers, editorModals } = useProductEditor({
    onUpdated: onRefresh,
  });
  const [productForPriceHistory, setProductForPriceHistory] = useState<Product | null>(null);
  const [productForHistory, setProductForHistory] = useState<Product | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const isServerPaginated = controlledCurrentPage !== undefined && !!onPageChange;
  const currentPage = controlledCurrentPage ?? localCurrentPage;
  const setCurrentPage = onPageChange ?? setLocalCurrentPage;

  useEffect(() => {
    if (!isServerPaginated) setCurrentPage(1);
  }, [isServerPaginated, searchQuery, localSearchQuery, lifecycleStatusFilter, supplierStatusFilter, pageResetKey]);

  const filteredProducts = useMemo(() => {
    if (isServerPaginated) return products;
    let filtered = products;

    filtered = filterProductsBySearch(filtered, searchQuery);

    filtered = filterProductsBySearch(filtered, localSearchQuery);

    return filtered;
  }, [isServerPaginated, products, searchQuery, localSearchQuery]);

  const paginatedProducts = useMemo(() => {
    if (isServerPaginated) return filteredProducts;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, isServerPaginated, itemsPerPage]);

  const totalItems = controlledTotalItems ?? filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const bulkAssignEnabled = canAssignDesigner && lifecycleStatusFilter === 'new';
  const bulkLifecycleEnabled = canAssignDesigner && lifecycleStatusFilter === 'in_sale';
  const bulkSelectionEnabled = bulkAssignEnabled || bulkLifecycleEnabled;
  const bulkActionMode: ProductBulkActionMode | null = bulkAssignEnabled
    ? 'assign_designer'
    : bulkLifecycleEnabled
      ? 'start_lifecycle'
      : null;

  useEffect(() => {
    const lastAvailablePage = Math.max(1, totalPages);
    if (currentPage > lastAvailablePage) {
      setCurrentPage(lastAvailablePage);
    }
  }, [currentPage, totalPages]);

  const selectableProductIds = useMemo(
    () => bulkActionMode ? getBulkSelectableProductIds(products, bulkActionMode) : [],
    [bulkActionMode, products]
  );
  const selectableProductIdSet = useMemo(
    () => new Set(selectableProductIds),
    [selectableProductIds]
  );
  const selectableProductIdsOnPage = useMemo(
    () => bulkActionMode
      ? getBulkSelectableProductIds(paginatedProducts, bulkActionMode)
      : [],
    [bulkActionMode, paginatedProducts]
  );

  const selectedProductIdsArray = useMemo(
    () => Array.from(selectedProductIds),
    [selectedProductIds]
  );

  const allSelectableOnPageSelected =
    selectableProductIdsOnPage.length > 0 &&
    selectableProductIdsOnPage.every((productId) => selectedProductIds.has(productId));

  useEffect(() => {
    setSelectedProductIds(new Set());
  }, [bulkSelectionEnabled, bulkActionMode, pageResetKey, searchQuery, supplierStatusFilter]);

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
        selectableProductIdsOnPage.forEach((productId) => next.delete(productId));
      } else {
        selectableProductIdsOnPage.forEach((productId) => next.add(productId));
      }
      return next;
    });
  };

  const selectAllEligibleProducts = async () => {
    if (!bulkActionMode) return;
    if (!onSelectAllEligible) {
      setSelectedProductIds(new Set(selectableProductIds));
      return;
    }

    try {
      setIsSelectingAll(true);
      const productIds = await onSelectAllEligible(bulkActionMode);
      setSelectedProductIds(new Set(productIds));
    } catch (error) {
      console.error('Ошибка массового выбора товаров:', error);
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleDesignerAssigned = () => {
    setSelectedProductIds(new Set());
    onRefresh();
  };

  const handleBulkLifecycleStarted = () => {
    setSelectedProductIds(new Set());
    onRefresh();
  };

  const emptyTitle = supplierStatusFilter === 'without'
    ? 'Товары без поставщика не найдены'
    : searchQuery || localSearchQuery
      ? 'Товары не найдены'
      : 'Товары не добавлены';

  const renderDenseActions = (product: Product) => {
    const allowedActions = product.permissions?.allowedActions || [];
    const primaryActions: ProductRowAction[] = [];
    const overflowActions: ProductRowAction[] = [];

    if (allowedActions.includes('manage_product_suppliers')) {
      primaryActions.push({
        key: 'suppliers',
        label: 'Управление поставщиками',
        icon: Users,
        onClick: () => openSuppliers(product),
      });
    }
    if (allowedActions.includes('edit_product_card')) {
      primaryActions.push({
        key: 'edit',
        label: 'Редактировать товар',
        icon: Edit,
        onClick: () => setProductForCard(product),
      });
    }
    if (allowedActions.includes('view_product_history')) {
      overflowActions.push({
        key: 'history',
        label: 'История товара',
        icon: History,
        onClick: () => setProductForHistory(product),
      });
    }
    if (canEdit) {
      overflowActions.push({
        key: 'price-history',
        label: 'История цен',
        icon: TrendingUp,
        onClick: () => setProductForPriceHistory(product),
      });
    }
    if (allowedActions.includes('manage_product_variations')) {
      overflowActions.push({
        key: 'variations',
        label: 'Управление вариациями',
        icon: Settings,
        onClick: () => setProductForVariations(product),
      });
    }
    if (allowedActions.includes('manage_marketplace')) {
      overflowActions.push({
        key: 'marketplaces',
        label: 'Маркетплейсы товара',
        icon: Store,
        onClick: () => setProductForMarketplace(product),
      });
    }
    if (canAssignDesigner && canStartProductLifecycle(product)) {
      overflowActions.push({
        key: 'lifecycle',
        label: product.lifecycleStartedAt ? 'Запустить новый цикл' : 'Запустить цикл',
        icon: Rocket,
        onClick: () => setProductForLifecycleStart(product),
      });
    }
    if (allowedActions.includes('delete_product')) {
      overflowActions.push({
        key: 'delete',
        label: 'Удалить товар',
        icon: Trash2,
        danger: true,
        onClick: () => setProductToDelete(product),
      });
    }

    if (primaryActions.length === 0 && overflowActions.length === 0) return undefined;
    return (
      <ProductRowActions
        primaryActions={primaryActions}
        overflowActions={overflowActions}
      />
    );
  };

  return (
    <div className={cn('flex flex-col flex-1', className)} style={{ minHeight: 0 }}>
      <div
        className={cn(
          'product-list-toolbar px-4 py-3 border-b border-border-subtle grid grid-cols-1 gap-3 bg-surface-page/95 backdrop-blur-sm sticky top-0 z-10 shrink-0',
          !compact &&
            'md:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[auto_auto_minmax(11rem,13rem)_minmax(11rem,13rem)] xl:items-center 2xl:grid-cols-[auto_auto_minmax(11rem,13rem)_minmax(11rem,13rem)_minmax(18rem,1fr)]'
        )}
      >
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            leftIcon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
            fullWidth
            className={cn(compact ? 'w-full' : 'md:w-auto md:shrink-0')}
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
            className={cn(compact ? 'w-full' : 'md:w-auto md:shrink-0')}
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
            className="min-w-0 xl:w-56"
            aria-label="Фильтр по этапу товара"
          >
            {PRODUCT_LIFECYCLE_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
        {onSupplierStatusFilterChange && (
          <Select
            value={supplierStatusFilter}
            onChange={(e) =>
              onSupplierStatusFilterChange(e.target.value as 'without' | '')
            }
            className="min-w-0 xl:w-52"
            aria-label="Фильтр по наличию поставщика"
          >
            <option value="">Поставщик: любой</option>
            <option value="without">Без поставщика</option>
          </Select>
        )}
        <div className={cn('relative min-w-0 w-full', !compact && 'md:col-span-2 xl:col-span-2 2xl:col-span-1')}>
          <Input
            leftIcon={Search}
            type="text"
            placeholder="Название, артикул или код товара..."
            value={onSearchQueryChange ? searchQuery : localSearchQuery}
            onChange={(e) => {
              if (onSearchQueryChange) onSearchQueryChange(e.target.value);
              else setLocalSearchQuery(e.target.value);
            }}
            className="pr-10 bg-brand-white border-border-subtle shadow-sm focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
          />
          {(onSearchQueryChange ? searchQuery : localSearchQuery) && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <IconButton
                icon={X}
                title="Очистить поиск"
                size="md"
                variant="ghost"
                onClick={() => {
                  if (onSearchQueryChange) onSearchQueryChange('');
                  else setLocalSearchQuery('');
                }}
              />
            </div>
          )}
        </div>
      </div>

      {bulkSelectionEnabled && (
        <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-muted/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-body text-brand-black cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only"
                checked={allSelectableOnPageSelected}
                disabled={selectableProductIdsOnPage.length === 0}
                onChange={togglePageSelection}
              />
              {allSelectableOnPageSelected ? (
                <CheckSquare className="h-4 w-4 text-brand-yellow-dark" aria-hidden />
              ) : (
                <Square className="h-4 w-4 text-text-muted" aria-hidden />
              )}
              <span>{allSelectableOnPageSelected ? 'Страница выбрана' : 'Выбрать страницу'}</span>
            </label>
            <span className="text-caption text-text-muted tabular-nums">
              Выбрано: {selectedProductIds.size}
            </span>
            {bulkAssignEnabled && selectedProductIds.size < totalItems && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSelectingAll}
                onClick={selectAllEligibleProducts}
              >
                {isSelectingAll ? 'Выбираем...' : `Выбрать все новые (${totalItems})`}
              </Button>
            )}
          </div>
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
              leftIcon={bulkAssignEnabled ? UserPlus : Rocket}
              disabled={selectedProductIds.size === 0}
              onClick={() => {
                if (bulkAssignEnabled) {
                  setIsAssignDesignerModalOpen(true);
                } else {
                  setIsBulkLifecycleModalOpen(true);
                }
              }}
            >
              {bulkAssignEnabled ? 'Передать дизайнеру' : 'Запустить lifecycle'}
            </Button>
          </div>
        </div>
      )}

      <div className="product-list-scroll flex-1 overflow-y-auto p-3 lg:p-4" style={{ minHeight: 0 }}>
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={emptyTitle}
            description={
              canEdit && !searchQuery && !localSearchQuery && !supplierStatusFilter
                ? 'Добавьте первый товар, чтобы начать работу'
                : undefined
            }
            action={
              canEdit && !searchQuery && !localSearchQuery && !supplierStatusFilter ? (
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
          <div className="product-list-items space-y-2">
            {paginatedProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                density={denseCatalog ? 'compact' : 'default'}
                selected={!denseCatalog && selectedProduct?.id === product.id}
                onClick={() => {
                  if (denseCatalog && product.permissions?.allowedActions.includes('edit_product_card')) {
                    setProductForCard(product);
                    return;
                  }
                  onSelectProduct(selectedProduct?.id === product.id ? null : product);
                }}
                children={
                  bulkSelectionEnabled && selectableProductIdSet.has(product.id) ? (
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
                  denseCatalog ? renderDenseActions(product) : (
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
                        {product.permissions?.allowedActions.includes('manage_marketplace') && (
                          <IconButton
                            icon={Store}
                            title="Маркетплейсы товара"
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductForMarketplace(product);
                            }}
                          />
                        )}
                        {canAssignDesigner && canStartProductLifecycle(product) && (
                          <IconButton
                            icon={Rocket}
                            title={product.lifecycleStartedAt ? 'Запустить новый цикл' : 'Запустить цикл'}
                            size="md"
                            variant="ghost"
                            className="h-8 w-8 min-h-8 min-w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductForLifecycleStart(product);
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
                              setProductForCard(product);
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
                  ) : undefined)
                }
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
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

      <ProductCardModal
        isOpen={!!productForCard}
        product={productForCard}
        onClose={() => setProductForCard(null)}
        onChanged={onRefresh}
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

      <Modal
        isOpen={!!productForMarketplace}
        onClose={() => setProductForMarketplace(null)}
        title="Маркетплейсы товара"
        size="xl"
      >
        {productForMarketplace && (
          <ProductMarketplacePanel
            product={productForMarketplace}
            onChanged={() => {
              setProductForMarketplace(null);
              onRefresh();
            }}
            onSaved={onRefresh}
          />
        )}
      </Modal>

      <StartProductLifecycleModal
        isOpen={!!productForLifecycleStart}
        product={productForLifecycleStart}
        onClose={() => setProductForLifecycleStart(null)}
        onSuccess={onRefresh}
      />

      <StartProductLifecycleModal
        isOpen={isBulkLifecycleModalOpen}
        product={null}
        productIds={selectedProductIdsArray}
        selectedCount={selectedProductIds.size}
        onClose={() => setIsBulkLifecycleModalOpen(false)}
        onSuccess={handleBulkLifecycleStarted}
      />
    </div>
  );
};
