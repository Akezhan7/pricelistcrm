import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import type { Supplier, Market } from '../types';
import { MarketManagementModal } from './MarketManagementModal';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { toast } from '../context/ToastContext';
import {
  SupplierFormFields,
  emptySupplierFormData,
  emptyProductLinkData,
  type SupplierFormData,
  type ProductLinkData,
} from './forms/SupplierFormFields';

export type SupplierFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  supplier?: Supplier | null;
  /** Привязка к товару при создании */
  productId?: number;
  productName?: string;
  initialProductData?: Partial<ProductLinkData>;
};

function buildAddress(data: SupplierFormData, isCreate: boolean): string | null {
  if (data.marketId) {
    if (data.row && data.container) {
      return `Ряд ${data.row}, Контейнер ${data.container}`;
    }
    if (data.row) return `Ряд ${data.row}`;
    if (data.container) return `Контейнер ${data.container}`;
    return isCreate ? null : '';
  }
  if (!data.cityAddress.trim()) return isCreate ? null : '';
  return data.cityAddress.trim();
}

function supplierToFormData(supplier: Supplier): SupplierFormData {
  const cityAddress = supplier.marketId ? '' : supplier.address || '';
  return {
    marketId: supplier.marketId ? String(supplier.marketId) : '',
    name: supplier.name || '',
    phone: supplier.phone || '',
    whatsapp: supplier.whatsapp || '',
    row:
      supplier.row !== undefined && supplier.row !== null ? String(supplier.row) : '',
    container:
      supplier.container !== undefined && supplier.container !== null
        ? String(supplier.container)
        : '',
    cityAddress,
    notes: supplier.notes || '',
    containerImage: null,
    debt: supplier.debt !== undefined ? supplier.debt.toString() : '0',
  };
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  supplier,
  productId,
  productName,
  initialProductData,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>(emptySupplierFormData());
  const [productLinkData, setProductLinkData] = useState<ProductLinkData>(emptyProductLinkData());
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const isWithProduct = mode === 'create' && !!productId;

  const loadMarkets = useCallback(async () => {
    setLoadingMarkets(true);
    try {
      const response = await api.get('/markets');
      setMarkets(response.data.data.markets || []);
    } catch {
      setError('Не удалось загрузить список рынков');
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMarkets();
    }
  }, [isOpen, loadMarkets]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && supplier) {
      setFormData(supplierToFormData(supplier));
      setCurrentImage(supplier.containerImage || null);
    } else if (mode === 'create') {
      setFormData(emptySupplierFormData());
      setCurrentImage(null);
      setProductLinkData({
        ...emptyProductLinkData(),
        supplierPrice: initialProductData?.supplierPrice || '',
        quantity: initialProductData?.quantity || '0',
        isAvailable: initialProductData?.isAvailable ?? true,
        notes: initialProductData?.notes || '',
      });
    }
    setError('');
  }, [isOpen, mode, supplier, initialProductData]);

  const resetAndClose = () => {
    setFormData(emptySupplierFormData());
    setProductLinkData(emptyProductLinkData());
    setError('');
    onClose();
  };

  const handleMarketChange = (newMarketId: string) => {
    if (newMarketId) {
      setFormData((prev) => ({ ...prev, marketId: newMarketId, cityAddress: '' }));
    } else {
      setFormData((prev) => ({ ...prev, marketId: '', row: '', container: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const address = buildAddress(formData, mode === 'create');

      if (mode === 'create') {
        if (formData.marketId && address === null) {
          setError('Для поставщиков на рынке укажите хотя бы номер ряда или контейнера');
          setLoading(false);
          return;
        }
        if (!formData.marketId && address === null) {
          setError('Укажите адрес поставщика в городе');
          setLoading(false);
          return;
        }

        const data = new FormData();
        data.append('name', formData.name.trim());
        data.append('phone', formData.phone.trim());
        data.append('whatsapp', formData.whatsapp.trim() || formData.phone.trim());
        data.append('address', address!);
        if (formData.marketId) data.append('marketId', formData.marketId);
        if (formData.row) data.append('row', formData.row.trim());
        if (formData.container) data.append('container', formData.container.trim());
        if (formData.notes.trim()) data.append('notes', formData.notes.trim());
        if (formData.containerImage) data.append('containerImage', formData.containerImage);

        const supplierResponse = await api.post('/suppliers', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newSupplierId = supplierResponse.data.data.supplier.id;

        if (isWithProduct && productId) {
          await api.post(`/products/${productId}/suppliers`, {
            supplierId: newSupplierId,
            supplierPrice: parseFloat(productLinkData.supplierPrice) || 0,
            quantity: parseInt(productLinkData.quantity) || 0,
            isAvailable: productLinkData.isAvailable,
            notes: productLinkData.notes.trim(),
          });
        }

        toast.success('Поставщик создан');
      } else {
        if (!supplier) return;

        const data = new FormData();
        data.append('name', formData.name);
        data.append('marketId', formData.marketId || '');
        data.append('address', address ?? '');

        if (formData.marketId) {
          data.append('row', formData.row || '');
          data.append('container', formData.container || '');
        } else {
          data.append('row', '');
          data.append('container', '');
        }

        data.append('phone', formData.phone);
        data.append('whatsapp', formData.whatsapp || formData.phone);
        data.append('notes', formData.notes);
        data.append('debt', formData.debt);

        if (formData.containerImage) {
          data.append('containerImage', formData.containerImage);
        }

        await api.put(`/suppliers/${supplier.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        toast.success('Поставщик обновлён');
      }

      setFormData(emptySupplierFormData());
      setProductLinkData(emptyProductLinkData());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (mode === 'create' ? 'Ошибка создания поставщика' : 'Ошибка обновления поставщика');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'edit'
      ? 'Редактировать поставщика'
      : 'Создать нового поставщика';

  const submitLabel =
    mode === 'edit'
      ? loading
        ? 'Сохранение...'
        : 'Сохранить изменения'
      : loading
        ? 'Создание...'
        : isWithProduct
          ? 'Создать и добавить к товару'
          : 'Создать поставщика';

  if (mode === 'edit' && !supplier) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={resetAndClose}
        title={title}
        size="lg"
        footer={
          <FormFooter
            onCancel={resetAndClose}
            submitLabel={submitLabel}
            submitLoading={loading}
            submitDisabled={loading}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
          />
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <SupplierFormFields
            data={formData}
            onChange={setFormData}
            onMarketChange={handleMarketChange}
            markets={markets}
            loadingMarkets={loadingMarkets}
            onOpenMarketModal={() => setShowMarketModal(true)}
            mode={mode}
            currentImageUrl={currentImage}
            withProduct={
              isWithProduct && productName
                ? {
                    productName,
                    linkData: productLinkData,
                    onLinkDataChange: setProductLinkData,
                  }
                : undefined
            }
          />
        </form>
      </Modal>

      <MarketManagementModal
        isOpen={showMarketModal}
        onClose={() => setShowMarketModal(false)}
        onMarketsUpdated={loadMarkets}
      />
    </>
  );
};
