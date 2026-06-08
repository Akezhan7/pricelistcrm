import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Select from 'react-select';
import api from '../utils/api';
import categoryApi from '../services/categoryApi';
import { SupplierFormModal } from './SupplierFormModal';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { ProductFormFields, emptyProductFormData } from './forms/ProductFormFields';
import { toast } from '../context/ToastContext';
import type { Category, Supplier } from '../types';

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Предзаполнить поставщика (со страницы поставщика) */
  initialSupplier?: Supplier | null;
  /** Заблокировать выбор других поставщиков */
  lockSupplier?: boolean;
  title?: string;
};

type SelectedSupplier = {
  supplier: Supplier;
  supplierPrice: string;
  quantity: string;
  isAvailable: boolean;
  notes: string;
};

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSupplier = null,
  lockSupplier = false,
  title = 'Добавить товар',
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyProductFormData());
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SelectedSupplier[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [suppliersExpanded, setSuppliersExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (!lockSupplier) {
        loadSuppliers();
      }
      resetForm();
      if (initialSupplier) {
        setSelectedSuppliers([
          {
            supplier: initialSupplier,
            supplierPrice: '',
            quantity: '0',
            isAvailable: true,
            notes: '',
          },
        ]);
        setSuppliersExpanded(true);
      }
    }
  }, [isOpen, initialSupplier, lockSupplier]);

  const resetForm = () => {
    setFormData(emptyProductFormData());
    setImage(null);
    setSelectedSuppliers([]);
    setSuppliersExpanded(false);
    setError('');
    setShowSupplierForm(false);
  };

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getCategories({ isActive: true });
      setCategories(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?limit=1000');
      setSuppliers(response.data.data.suppliers || []);
    } catch (error) {
      console.error('Ошибка загрузки поставщиков:', error);
    }
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    if (selectedSuppliers.find(s => s.supplier.id === supplier.id)) {
      return;
    }

    setSelectedSuppliers([
      ...selectedSuppliers,
      {
        supplier,
        supplierPrice: formData.costPrice || '',
        quantity: '0',
        isAvailable: true,
        notes: '',
      }
    ]);
  };

  const handleRemoveSupplier = (supplierId: number) => {
    setSelectedSuppliers(selectedSuppliers.filter(s => s.supplier.id !== supplierId));
  };

  const handleUpdateSupplierData = (supplierId: number, field: keyof Omit<SelectedSupplier, 'supplier'>, value: any) => {
    setSelectedSuppliers(selectedSuppliers.map(s => 
      s.supplier.id === supplierId 
        ? { ...s, [field]: value }
        : s
    ));
  };

  const handleSupplierCreated = () => {
    loadSuppliers();
    setShowSupplierForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockSupplier && selectedSuppliers.length > 0) {
      const price = parseFloat(selectedSuppliers[0].supplierPrice);
      if (Number.isNaN(price) || price < 0) {
        setError('Укажите цену у поставщика');
        return;
      }
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('article', formData.article);
      data.append('internalName', formData.internalName || '');
      data.append('kaspiName', formData.kaspiName || '');
      data.append('kaspiArticle', formData.kaspiArticle || '');
      data.append('costPrice', formData.costPrice);
      data.append('sellingPrice', formData.sellingPrice);
      data.append('currentStock', formData.currentStock);
      data.append('minStock', formData.minStock);
      if (formData.categoryId) {
        data.append('categoryId', formData.categoryId);
      }
      data.append('description', formData.description || '');
      
      if (image) {
        data.append('image', image);
      }


      const response = await api.post('/products', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const createdProduct = response.data?.data?.product;

      if (!createdProduct || !createdProduct.id) {
        throw new Error('Товар создан, но ID не получен');
      }

      if (selectedSuppliers.length > 0) {
        const supplierPromises = selectedSuppliers.map(async (selected) => {
          const price = parseFloat(selected.supplierPrice);
          if (lockSupplier && (Number.isNaN(price) || price < 0)) {
            throw new Error('Укажите цену у поставщика');
          }
          try {
            await api.post(`/products/${createdProduct.id}/suppliers`, {
              supplierId: selected.supplier.id,
              supplierPrice: Number.isNaN(price) ? 0 : price,
              quantity: parseInt(selected.quantity) || 0,
              isAvailable: selected.isAvailable,
              notes: selected.notes || '',
            });
          } catch (err: any) {
    console.error('Ошибка привязки поставщика', selected.supplier.name, err);
              throw err;
          }
        });

        await Promise.all(supplierPromises);
      }

      resetForm();
      toast.success('Товар создан');
      onSuccess();
      onClose();
    } catch (err: any) {
    console.error('Ошибка создания товара:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка создания товара';
      setError(errorMessage);
      console.error('Детали ошибки:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const availableSuppliers = suppliers.filter(
    supplier => !selectedSuppliers.find(s => s.supplier.id === supplier.id)
  );

  const supplierOptions = availableSuppliers.map(supplier => ({
    value: supplier.id,
    label: `${supplier.name}${supplier.market ? ` (${supplier.market.name})` : supplier.address ? ` (${supplier.address})` : ''}`,
    supplier: supplier,
  }));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="lg"
        footer={
          <FormFooter
            onCancel={onClose}
            submitLabel={loading ? 'Сохранение...' : 'Сохранить товар'}
            submitLoading={loading}
            submitDisabled={loading}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <ProductFormFields
            data={formData}
            onChange={setFormData}
            categories={categories}
            image={image}
            onImageChange={setImage}
            mode="create"
            onCostPriceChange={(value) => {
              if (lockSupplier && selectedSuppliers.length === 1 && !selectedSuppliers[0].supplierPrice) {
                setSelectedSuppliers([{ ...selectedSuppliers[0], supplierPrice: value }]);
              }
            }}
          />

          {/* Секция поставщиков */}
          <div className="border border-gray-200 rounded-lg">
            {!lockSupplier && (
              <button
                type="button"
                onClick={() => setSuppliersExpanded(!suppliersExpanded)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Поставщики
                  </h3>
                  <span className="text-xs text-gray-500">
                    (необязательно, {selectedSuppliers.length} выбрано)
                  </span>
                </div>
                {suppliersExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}

            {lockSupplier && initialSupplier && (
              <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                <h3 className="text-sm font-semibold text-gray-900">Поставщик</h3>
                <p className="text-sm text-gray-700 mt-0.5">{initialSupplier.name}</p>
              </div>
            )}

            {(suppliersExpanded || lockSupplier) && (
              <div className="p-3 space-y-3 bg-white">
                {!lockSupplier && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      options={supplierOptions}
                      placeholder="Выбрать существующего..."
                      noOptionsMessage={() => 'Поставщики не найдены'}
                      onChange={(option) => option && handleSelectSupplier(option.supplier)}
                      value={null}
                      isClearable
                      menuPlacement="auto"
                      maxMenuHeight={250}
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '42px',
                          fontSize: '15px',
                          borderColor: '#d1d5db',
                        }),
                        option: (base, state) => ({
                          ...base,
                          fontSize: '15px',
                          padding: '10px 12px',
                          backgroundColor: state.isFocused ? '#f3f4f6' : state.isSelected ? '#3b82f6' : 'white',
                          color: state.isSelected ? 'white' : '#1f2937',
                          cursor: 'pointer',
                          ':active': {
                            backgroundColor: '#e5e7eb',
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          fontSize: '15px',
                          zIndex: 50,
                        }),
                        menuList: (base) => ({
                          ...base,
                          maxHeight: '250px',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          fontSize: '15px',
                          color: '#9ca3af',
                        }),
                        singleValue: (base) => ({
                          ...base,
                          fontSize: '15px',
                        }),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSupplierForm(true)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1 text-sm font-medium transition-colors flex-shrink-0"
                    title="Создать нового поставщика"
                  >
                    <Plus className="h-4 w-4" />
                    Новый
                  </button>
                </div>
                )}

                {/* Список выбранных поставщиков */}
                {selectedSuppliers.length > 0 && (
                  <div className="space-y-2">
                    {selectedSuppliers.map((selected) => (
                      <div
                        key={selected.supplier.id}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                      >
                        {/* Заголовок с названием поставщика */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {selected.supplier.name}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {selected.supplier.market 
                                ? `${selected.supplier.market.name} - Ряд ${selected.supplier.row}, Контейнер ${selected.supplier.container}`
                                : selected.supplier.address || '—'
                              }
                            </p>
                          </div>
                          {!lockSupplier && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSupplier(selected.supplier.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-2 flex-shrink-0"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Поля для ввода цены и количества */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Цена поставщика *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={selected.supplierPrice}
                              onChange={(e) => handleUpdateSupplierData(selected.supplier.id, 'supplierPrice', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Количество
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={selected.quantity}
                              onChange={(e) => handleUpdateSupplierData(selected.supplier.id, 'quantity', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Чекбокс доступности */}
                        <div className="mt-2">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.isAvailable}
                              onChange={(e) => handleUpdateSupplierData(selected.supplier.id, 'isAvailable', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                            />
                            <span className="text-xs text-gray-700">Товар в наличии</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSuppliers.length === 0 && !lockSupplier && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Выберите поставщиков из списка или создайте нового
                  </p>
                )}
              </div>
            )}
          </div>

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
