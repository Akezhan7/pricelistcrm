import React, { useMemo, useState, useEffect } from 'react';

import { Product } from '../types';

import {
  Plus,
  Edit,
  Trash2,
  Users,
  Settings,
  TrendingUp,
  Package,
  Search,
  X,
} from 'lucide-react';

import { Button, EmptyState, IconButton, Input, Pagination } from './ui';

import { ProductListItem } from './ProductListItem';

import { CreateProductModal } from './CreateProductModal';

import { DeleteConfirmModal } from './DeleteConfirmModal';

import { useProductEditor } from '../hooks/useProductEditor';

import { ProductVariationsModal } from './ProductVariationsModal';

import { PriceHistoryModal } from './PriceHistoryModal';

import api from '../utils/api';

type ProductListProps = {
  products: Product[];
  searchQuery: string;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onRefresh: () => void;
  canEdit: boolean;
};

export const ProductList: React.FC<ProductListProps> = ({
  products,
  searchQuery,
  selectedProduct,
  onSelectProduct,
  onRefresh,
  canEdit,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productForVariations, setProductForVariations] = useState<Product | null>(null);

  const { openEdit, openSuppliers, editorModals } = useProductEditor({
    onUpdated: onRefresh,
  });
  const [productForPriceHistory, setProductForPriceHistory] = useState<Product | null>(null);
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
                footer={
                  canEdit ? (
                    <div className="flex justify-end">
                      <div className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-inset/60 p-1">
                        <IconButton
                          icon={TrendingUp}
                          title="История цен"
                          size="md"
                          variant="ghost"
                          className="md:h-8 md:w-8 md:min-h-8 md:min-w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductForPriceHistory(product);
                          }}
                        />
                        <IconButton
                          icon={Users}
                          title="Управление поставщиками"
                          size="md"
                          variant="ghost"
                          className="md:h-8 md:w-8 md:min-h-8 md:min-w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSuppliers(product);
                          }}
                        />
                        <IconButton
                          icon={Settings}
                          title="Управление вариациями"
                          size="md"
                          variant="ghost"
                          className="md:h-8 md:w-8 md:min-h-8 md:min-w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductForVariations(product);
                          }}
                        />
                        <IconButton
                          icon={Edit}
                          title="Редактировать товар"
                          size="md"
                          variant="ghost"
                          className="md:h-8 md:w-8 md:min-h-8 md:min-w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(product);
                          }}
                        />
                        <IconButton
                          icon={Trash2}
                          title="Удалить товар"
                          size="md"
                          variant="danger"
                          className="md:h-8 md:w-8 md:min-h-8 md:min-w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                          }}
                        />
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
    </div>
  );
};
