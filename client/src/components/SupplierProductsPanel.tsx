import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Undo2, PackagePlus, Link2 } from 'lucide-react';
import { Supplier } from '../types';
import { SupplierProductCatalog } from './SupplierProductCatalog';
import { useSupplierProducts } from '../hooks/useSupplierProducts';
import { useProductEditor } from '../hooks/useProductEditor';
import { useSupplierProductActions } from '../hooks/useSupplierProductActions';
import { useOrderDraft } from '../context/OrderDraftContext';
import { calcDraftTotal, countDraftProducts } from '../utils/orderDraftStorage';
import { Button, CardHeader } from './ui';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';

const blackButtonClass =
  'bg-brand-black text-brand-white hover:bg-gray-800 focus-visible:ring-brand-black';

interface SupplierProductsPanelProps {
  supplier: Supplier;
  onOrderSuccess?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  /** На экранах без нижней tab bar (например, детали поставщика) */
  mobileActionBarAtBottom?: boolean;
  /** Скрыть дублирующий заголовок «Поставщик {name}» (страница деталей) */
  showSupplierHeader?: boolean;
  /** Плотная сетка на странице деталей; список по умолчанию */
  layout?: 'list' | 'grid';
}

export const SupplierProductsPanel: React.FC<SupplierProductsPanelProps> = ({
  supplier,
  onOrderSuccess,
  canCreate = true,
  canEdit = false,
  mobileActionBarAtBottom = false,
  showSupplierHeader = true,
  layout = 'list',
}) => {
  const location = useLocation();
  const {
    draft,
    isDraftForSupplier,
    getSelectedIds,
    getQuantities,
    toggleDraftProduct,
    setDraftProductQuantity,
    openModal: openOrderModal,
    setDraftReturnPath,
  } = useOrderDraft();

  const { products, loading, refetch } = useSupplierProducts(supplier.id);
  const { openEdit, openSuppliers, loadingProductId, editorModals } = useProductEditor({
    onUpdated: refetch,
    contextSupplierId: supplier.id,
  });
  const { openLinkModal, openCreateModal, actionModals } = useSupplierProductActions({
    supplier,
    onUpdated: refetch,
  });

  const [search, setSearch] = useState('');

  const returnPath = location.pathname;
  const selectedIds = getSelectedIds(supplier.id);
  const quantities = getQuantities(supplier.id);
  const isActiveDraft = isDraftForSupplier(supplier.id);

  useEffect(() => {
    if (isActiveDraft) {
      setDraftReturnPath(returnPath);
    }
  }, [isActiveDraft, returnPath, setDraftReturnPath]);

  const toggleSelect = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    toggleDraftProduct(supplier.id, supplier.name, product, returnPath);
  };

  const setQuantity = (id: number, qty: number) => {
    setDraftProductQuantity(supplier.id, id, qty);
  };

  const selectedCount = isActiveDraft && draft ? countDraftProducts(draft) : selectedIds.size;

  const totalSelected = useMemo(() => {
    if (!isActiveDraft || !draft) return 0;
    return calcDraftTotal(draft);
  }, [isActiveDraft, draft]);

  const handleOpenModal = (type: 'purchase' | 'return') => {
    openOrderModal(type, {
      origin: 'supplier-panel',
      supplierId: supplier.id,
      supplierName: supplier.name,
      returnPath,
      onSuccess: onOrderSuccess,
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <CardHeader
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-muted',
          !showSupplierHeader && 'sm:justify-end'
        )}
      >
        {showSupplierHeader ? (
          <div className="min-w-0">
            <div className="text-sm text-text-muted">Поставщик</div>
            <div className="text-lg font-semibold text-brand-black truncate">{supplier.name}</div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="text-section-title text-brand-black">Каталог</div>
            <div className="text-caption text-text-muted">Цены и оформление заявок</div>
          </div>
        )}
        <div className="sm:text-right shrink-0">
          <div className="text-xs text-text-muted">Выбрано</div>
          <div className="text-lg font-bold text-brand-black tabular-nums">{selectedCount}</div>
        </div>
      </CardHeader>

      <div
        className={cn(
          'flex-1 flex flex-col p-4 min-h-0',
          layout === 'grid' && 'max-md:flex-none',
          canCreate && 'max-md:pb-28'
        )}
      >
        {canEdit && (
          <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={Link2}
              onClick={openLinkModal}
              className="flex-1 min-w-[9rem]"
            >
              Из каталога
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={PackagePlus}
              onClick={openCreateModal}
              className="flex-1 min-w-[9rem]"
            >
              Создать новый
            </Button>
          </div>
        )}
        <SupplierProductCatalog
          products={products}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          mode="select"
          layout={layout}
          className={layout === 'grid' ? 'md:flex-1' : 'flex-1'}
          listMaxHeight="fill"
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          quantities={quantities}
          onQuantityChange={setQuantity}
          canEdit={canEdit}
          onEditProduct={openEdit}
          onManageSuppliers={openSuppliers}
          loadingProductId={loadingProductId}
        />
      </div>

      {canCreate && (
        <div
          className={cn(
            'border-t border-border-subtle bg-brand-white/95 backdrop-blur-md',
            'p-4 max-md:p-3 md:relative',
            'max-md:fixed max-md:inset-x-0 max-md:z-40',
            mobileActionBarAtBottom ? 'max-md:bottom-0 max-md:pb-safe' : 'max-md:bottom-above-tab-bar',
            'max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.08)]'
          )}
        >
          {selectedCount > 0 && (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-text-muted">
                Выбрано: {selectedCount}
                <span className="hidden sm:inline"> · Итого</span>
              </span>
              <span className="font-bold tabular-nums text-brand-black">
                {formatPriceKZT(totalSelected)}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={Plus}
              disabled={selectedCount === 0}
              onClick={() => handleOpenModal('purchase')}
              className="w-full sm:flex-1 sm:min-w-[9rem]"
              fullWidth
            >
              Создать заявку
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={Undo2}
              disabled={selectedCount === 0}
              onClick={() => handleOpenModal('return')}
              className={cn('w-full sm:flex-1 sm:min-w-[9rem]', blackButtonClass)}
              fullWidth
            >
              <span className="sm:hidden">Возврат</span>
              <span className="hidden sm:inline">Оформить возврат</span>
            </Button>
          </div>
        </div>
      )}

      {editorModals}
      {actionModals}
    </div>
  );
};
