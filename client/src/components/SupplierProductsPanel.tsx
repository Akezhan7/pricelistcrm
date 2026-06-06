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

interface SupplierProductsPanelProps {
  supplier: Supplier;
  onOrderSuccess?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
}

export const SupplierProductsPanel: React.FC<SupplierProductsPanelProps> = ({
  supplier,
  onOrderSuccess,
  canCreate = true,
  canEdit = false,
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

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat('ru-RU').format(Number(price) || 0);

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
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Поставщик</div>
          <div className="text-lg font-semibold text-gray-900">{supplier.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Выбрано</div>
          <div className="text-lg font-bold text-gray-900">{selectedCount}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 bg-white min-h-0">
        {canEdit && (
          <div className="flex gap-2 mb-3 flex-shrink-0">
            <button
              type="button"
              onClick={openLinkModal}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              Из каталога
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors"
            >
              <PackagePlus className="w-4 h-4" />
              Создать новый
            </button>
          </div>
        )}
        <SupplierProductCatalog
          products={products}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          mode="select"
          className="flex-1"
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
        <div className="border-t border-gray-200 p-4 bg-white">
          {selectedCount > 0 && (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Итого по выбранным:</span>
              <span className="font-bold text-gray-900">{formatPrice(totalSelected)} ₸</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleOpenModal('purchase')}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Создать заявку
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleOpenModal('return')}
              className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
              Оформить возврат
            </button>
          </div>
        </div>
      )}

      {editorModals}
      {actionModals}
    </div>
  );
};
