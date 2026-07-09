import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../utils/api';
import type { Supplier } from '../types';
import { Alert, Button, FileUploadZone, FormFooter, FormField, Input, Modal, Select, Textarea } from './ui';
import { SupplierFormModal } from './SupplierFormModal';
import { toast } from '../context/ToastContext';

type CreateProductDraftModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const CreateProductDraftModal: React.FC<CreateProductDraftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierPrice, setSupplierPrice] = useState('');
  const [comment, setComment] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier.id) === supplierId) || null,
    [suppliers, supplierId]
  );

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setCostPrice('');
    setSupplierId('');
    setSupplierPrice('');
    setComment('');
    setImage(null);
    setError('');
    setShowSupplierForm(false);
  };

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const response = await api.get('/suppliers?limit=1000');
      setSuppliers(response.data.data.suppliers || []);
    } catch {
      setError('Не удалось загрузить поставщиков');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleSupplierCreated = async () => {
    await loadSuppliers();
    setShowSupplierForm(false);
    toast.success('Поставщик добавлен в список');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const parsedCostPrice = Number(costPrice);
    const parsedSupplierPrice = supplierPrice ? Number(supplierPrice) : parsedCostPrice;

    if (!trimmedName) {
      setError('Укажите рабочее название товара');
      return;
    }

    if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
      setError('Укажите корректную себестоимость');
      return;
    }

    if (supplierId && (!Number.isFinite(parsedSupplierPrice) || parsedSupplierPrice < 0)) {
      setError('Укажите корректную цену поставщика');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', trimmedName);
      data.append('costPrice', String(parsedCostPrice));
      if (supplierId) {
        data.append('supplierId', supplierId);
        data.append('supplierPrice', String(parsedSupplierPrice));
      }
      if (comment.trim()) data.append('comment', comment.trim());
      if (image) data.append('image', image);

      await api.post('/products/drafts', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Черновик товара создан');
      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Не удалось создать черновик товара';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Быстрый черновик товара"
        size="md"
        footer={
          <FormFooter
            onCancel={handleClose}
            submitLabel={loading ? 'Создание...' : 'Создать черновик'}
            submitLoading={loading}
            submitDisabled={loading}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <FormField label="Фото товара">
            <FileUploadZone
              selectedFile={image}
              onFileChange={setImage}
              label="Добавить фото"
              hint="Фото можно заменить позже"
            />
          </FormField>

          <Input
            label="Рабочее название"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: Маска сварочная черная"
          />

          <Input
            label="Себестоимость"
            required
            type="number"
            min={0}
            step="0.01"
            value={costPrice}
            onChange={(event) => {
              setCostPrice(event.target.value);
              if (!supplierPrice) setSupplierPrice(event.target.value);
            }}
            placeholder="0"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Select
              label="Поставщик"
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value);
                if (!supplierPrice) setSupplierPrice(costPrice);
              }}
              disabled={loadingSuppliers}
            >
              <option value="">Без поставщика</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              leftIcon={Plus}
              onClick={() => setShowSupplierForm(true)}
              className="sm:mb-0"
            >
              Новый
            </Button>
          </div>

          {selectedSupplier && (
            <Input
              label="Цена поставщика"
              type="number"
              min={0}
              step="0.01"
              value={supplierPrice}
              onChange={(event) => setSupplierPrice(event.target.value)}
              placeholder={costPrice || '0'}
            />
          )}

          <Textarea
            label="Комментарий"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Что важно передать дизайнеру или руководителю"
            className="resize-none"
          />
        </form>
      </Modal>

      <SupplierFormModal
        isOpen={showSupplierForm}
        onClose={() => setShowSupplierForm(false)}
        onSuccess={handleSupplierCreated}
        mode="create"
      />
    </>
  );
};
