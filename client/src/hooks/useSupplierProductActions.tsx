import React, { useState } from 'react';
import { LinkProductToSupplierModal } from '../components/LinkProductToSupplierModal';
import { CreateProductModal } from '../components/CreateProductModal';
import type { Supplier } from '../types';

interface UseSupplierProductActionsOptions {
  supplier: Supplier;
  onUpdated: () => void;
}

export function useSupplierProductActions({ supplier, onUpdated }: UseSupplierProductActionsOptions) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const handleSuccess = () => {
    onUpdated();
  };

  const actionModals = (
    <>
      <LinkProductToSupplierModal
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSuccess={handleSuccess}
        supplier={supplier}
      />
      <CreateProductModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleSuccess}
        initialSupplier={supplier}
        lockSupplier
        title={`Создать товар для «${supplier.name}»`}
      />
    </>
  );

  return {
    openLinkModal: () => setLinkOpen(true),
    openCreateModal: () => setCreateOpen(true),
    actionModals,
  };
}
