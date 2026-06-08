import React, { useState, useEffect, useMemo } from 'react';

import { Supplier, Product } from '../types';

import {
  MessageSquare,
  Phone,
  MapPin,
  Package,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  DollarSign,
  Building2,
  Search,
  X,
} from 'lucide-react';

import { Badge, Button, EmptyState, IconButton, Input, Pagination } from './ui';

import { SupplierFormModal } from './SupplierFormModal';

import { DeleteConfirmModal } from './DeleteConfirmModal';

import { SupplierFinanceModal } from './SupplierFinanceModal';

import api from '../utils/api';

import getImageUrl from '../utils/image';

import { cn } from '../utils/cn';

type SupplierCardsProps = {
  suppliers: Supplier[];
  selectedProduct: Product | null;
  onRefresh: () => void;
  canEdit: boolean;
  onSelectSupplier?: (supplier: Supplier) => void;
  selectedSupplierId?: number | null;
};

export const SupplierCards: React.FC<SupplierCardsProps> = ({
  suppliers,
  selectedProduct,
  onRefresh,
  canEdit,
  onSelectSupplier,
  selectedSupplierId,
}) => {
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const el = e.currentTarget;
    el.onerror = null;
    el.src = '/placeholder.svg';
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [financeSupplier, setFinanceSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProduct, searchQuery]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.phone?.toLowerCase().includes(query) ||
      supplier.address?.toLowerCase().includes(query) ||
      supplier.sector?.toLowerCase().includes(query) ||
      supplier.row?.toString().toLowerCase().includes(query) ||
      supplier.container?.toString().toLowerCase().includes(query)
    );
  });

  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`);
      onRefresh();
      setSupplierToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления поставщика:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const emptyTitle = searchQuery
    ? 'Поставщики не найдены'
    : selectedProduct
      ? 'Поставщики для этого товара не найдены'
      : 'Поставщики не добавлены';

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
      <div className="px-4 py-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-inset/50 sticky top-0 z-10 shrink-0">
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            leftIcon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
            fullWidth
            className="sm:w-auto sm:shrink-0"
          >
            Добавить поставщика
          </Button>
        )}
        <div className="relative flex-1 min-w-0 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none z-10"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="Поиск по названию, телефону, адресу, сектору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-brand-white border-border-subtle shadow-sm focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
          />
          {searchQuery && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <IconButton
                icon={X}
                title="Очистить поиск"
                size="md"
                variant="ghost"
                onClick={() => setSearchQuery('')}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={emptyTitle}
            description={
              canEdit && !searchQuery && !selectedProduct
                ? 'Добавьте первого поставщика, чтобы начать работу'
                : undefined
            }
            action={
              canEdit && !searchQuery && !selectedProduct ? (
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={Plus}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Добавить поставщика
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5"
            style={{ maxWidth: '1800px', margin: '0 auto' }}
          >
            {paginatedSuppliers.map((supplier) => {
              const productPrice = selectedProduct
                ? supplier.products?.find((p) => p.id === selectedProduct.id)?.ProductSupplier
                : null;

              const isSelected = selectedSupplierId === supplier.id;

              return (
                <div
                  key={supplier.id}
                  className={cn(
                    'group flex flex-col rounded-xl border bg-brand-white overflow-hidden shadow-sm',
                    'transition-[shadow,transform] duration-200 ease-product',
                    onSelectSupplier &&
                      'cursor-pointer hover:shadow-card-hover hover:-translate-y-px active:scale-[0.99]',
                    isSelected
                      ? 'border-l-4 border-l-brand-yellow bg-brand-yellow/5 border-border-subtle shadow-sm'
                      : 'border-border-subtle'
                  )}
                  onClick={() => onSelectSupplier?.(supplier)}
                >
                  <div className="relative">
                    {supplier.containerImage ? (
                      <img
                        src={getImageUrl(supplier.containerImage) || undefined}
                        alt={`Контейнер ${supplier.name}`}
                        className="h-32 w-full object-cover sm:h-auto sm:aspect-video"
                        onError={handleImgError}
                      />
                    ) : (
                      <div className="h-32 w-full bg-surface-inset flex items-center justify-center sm:h-auto sm:aspect-video">
                        <ImageIcon className="h-8 w-8 text-text-muted" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 p-4">
                    <div className="mb-3">
                      <h3 className="text-card-title text-brand-black truncate leading-snug">
                        {supplier.name}
                      </h3>

                      {supplier.market && (
                        <div className="flex items-center gap-1.5 text-caption text-accent mt-1">
                          <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="font-medium truncate">{supplier.market.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-caption text-text-muted mt-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">
                          {supplier.row || supplier.container ? (
                            <>
                              {supplier.row ? `Ряд ${supplier.row}` : ''}
                              {supplier.row && supplier.container ? ', ' : ''}
                              {supplier.container ? `Контейнер ${supplier.container}` : ''}
                            </>
                          ) : (
                            supplier.address || '—'
                          )}
                        </span>
                      </div>

                      {supplier.sector && (
                        <Badge variant="info" className="mt-2">
                          {supplier.sector}
                        </Badge>
                      )}
                    </div>

                    {selectedProduct && productPrice && (
                      <div className="mb-3 p-3 rounded-lg bg-success-light border border-success/15">
                        <div className="text-body font-semibold tabular-nums text-success-dark">
                          {formatPrice(productPrice.supplierPrice)} ₸
                        </div>
                        <div className="text-caption text-success-dark/80 mt-0.5">
                          В наличии: {productPrice.quantity} шт.
                          {!productPrice.isAvailable && (
                            <span className="text-danger ml-1.5">• Недоступно</span>
                          )}
                        </div>
                        {productPrice.notes && (
                          <div className="text-caption text-text-muted mt-1">{productPrice.notes}</div>
                        )}
                      </div>
                    )}

                    {!selectedProduct && supplier.products && supplier.products.length > 0 && (
                      <div className="mb-3 inline-flex items-center gap-1.5 text-caption text-text-muted">
                        <Package className="h-3.5 w-3.5" aria-hidden />
                        <span>Товаров: {supplier.products.length}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsApp(supplier.whatsapp || supplier.phone);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 rounded-pill bg-surface-inset border border-border-subtle text-caption font-medium text-brand-black hover:bg-surface-inset/80 hover:shadow-sm transition-all duration-fast"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-success" aria-hidden />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(supplier.phone);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 rounded-pill bg-surface-inset border border-border-subtle text-caption font-medium text-brand-black hover:bg-surface-inset/80 hover:shadow-sm transition-all duration-fast"
                      >
                        <Phone className="h-3.5 w-3.5 text-accent" aria-hidden />
                        <span className="truncate max-w-[140px]">{supplier.phone}</span>
                      </button>
                    </div>

                    <div className="mt-auto pt-3 border-t border-border-subtle">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-caption font-medium text-text-muted">Финансы</span>
                          {supplier.debt && supplier.debt > 0 ? (
                            <Badge variant="danger">
                              Долг: {formatPrice(supplier.debt)} ₸
                            </Badge>
                          ) : (
                            <Badge variant="success">Нет долга</Badge>
                          )}
                        </div>
                        <IconButton
                          icon={DollarSign}
                          title="Управление финансами"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFinanceSupplier(supplier);
                          }}
                        />
                      </div>
                    </div>

                    {supplier.notes && (
                      <p className="text-caption text-text-muted mt-3 line-clamp-2 leading-relaxed">
                        {supplier.notes}
                      </p>
                    )}

                    {canEdit && (
                      <div className="flex justify-end gap-0.5 mt-3 pt-3 border-t border-border-subtle">
                        <IconButton
                          icon={Edit}
                          title="Редактировать поставщика"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSupplier(supplier);
                          }}
                        />
                        <IconButton
                          icon={Trash2}
                          title="Удалить поставщика"
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSupplierToDelete(supplier);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSuppliers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        variant="numbered"
      />

      <SupplierFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onRefresh}
        mode="create"
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
      />

      <SupplierFormModal
        isOpen={!!editingSupplier}
        onClose={() => setEditingSupplier(null)}
        onSuccess={() => {
          onRefresh();
          setEditingSupplier(null);
        }}
        mode="edit"
        supplier={editingSupplier}
      />

      <DeleteConfirmModal
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleDeleteSupplier}
        loading={isDeleting}
        title="Удалить поставщика"
        message="Вы уверены, что хотите удалить этого поставщика?"
        itemName={supplierToDelete?.name}
      />

      <SupplierFinanceModal
        isOpen={!!financeSupplier}
        onClose={() => setFinanceSupplier(null)}
        supplierId={financeSupplier?.id || 0}
        supplierName={financeSupplier?.name || ''}
        onSuccess={() => {
          onRefresh();
          setFinanceSupplier(null);
        }}
      />
    </div>
  );
};
