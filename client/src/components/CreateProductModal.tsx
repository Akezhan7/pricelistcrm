import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Select from 'react-select';
import api from '../utils/api';
import categoryApi from '../services/categoryApi';
import { UnifiedSupplierForm } from './UnifiedSupplierForm';
import type { Category, Supplier } from '../types';

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    article: '',
    internalName: '',
    kaspiName: '',
    kaspiArticle: '',
    costPrice: '',
    sellingPrice: '',
    currentStock: '0',
    minStock: '0',
    categoryId: '',
    description: '',
  });
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
      loadSuppliers();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      article: '',
      internalName: '',
      kaspiName: '',
      kaspiArticle: '',
      costPrice: '',
      sellingPrice: '',
      currentStock: '0',
      minStock: '0',
      categoryId: '',
      description: '',
    });
    setImage(null);
    setSelectedSuppliers([]);
    setSuppliersExpanded(false);
    setError('');
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
    setLoading(true);
    setError('');

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
          try {
            await api.post(`/products/${createdProduct.id}/suppliers`, {
              supplierId: selected.supplier.id,
              supplierPrice: parseFloat(selected.supplierPrice) || 0,
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

  if (!isOpen) return null;

  const availableSuppliers = suppliers.filter(
    supplier => !selectedSuppliers.find(s => s.supplier.id === supplier.id)
  );

  const supplierOptions = availableSuppliers.map(supplier => ({
    value: supplier.id,
    label: `${supplier.name}${supplier.market ? ` (${supplier.market.name})` : supplier.address ? ` (${supplier.address})` : ''}`,
    supplier: supplier,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Добавить товар</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название товара *
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Конструктор LEGO"
            />
          </div>

          {/* Новые поля для Kaspi и внутреннего использования */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Дополнительные названия</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Внутреннее название
                  <span className="text-xs text-gray-500 ml-1">(для сотрудников)</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.internalName}
                  onChange={(e) => setFormData({ ...formData, internalName: e.target.value })}
                  placeholder="Например: Маска сварная чёрная"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название для Kaspi
                  <span className="text-xs text-gray-500 ml-1">(НЕ менять после выгрузки!)</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.kaspiName}
                  onChange={(e) => setFormData({ ...formData, kaspiName: e.target.value })}
                  placeholder="Официальное название для Kaspi"
                />
              </div>

              <div>
          {/* Остатки на складе */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-green-900 mb-3">Управление остатками</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текущий остаток
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Минимальный порог
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  При достижении этого уровня товар попадёт в список закупа
                </p>
              </div>
            </div>
          </div>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Артикул Kaspi
                  <span className="text-xs text-gray-500 ml-1">(НЕ менять после выгрузки!)</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.kaspiArticle}
                  onChange={(e) => setFormData({ ...formData, kaspiArticle: e.target.value })}
                  placeholder="Артикул для Kaspi"
                />
              </div>
            </div>
          </div>

          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория
            </label>
            <select
              className="input-field"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Без категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Артикул *
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.article}
              onChange={(e) => setFormData({ ...formData, article: e.target.value })}
              placeholder="Например: LEGO-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Себестоимость *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="input-field"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена продажи *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="input-field"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="1500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Дополнительное описание товара..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Фотография товара
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Выберите файл
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG до 5MB</p>
                {image && (
                  <p className="text-xs text-green-600 mt-1">
                    Выбрано: {image.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Секция поставщиков */}
          <div className="border border-gray-200 rounded-lg">
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

            {suppliersExpanded && (
              <div className="p-3 space-y-3 bg-white">
                {/* Выбор существующего поставщика и кнопка создания */}
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
                          <button
                            type="button"
                            onClick={() => handleRemoveSupplier(selected.supplier.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-2 flex-shrink-0"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

                {selectedSuppliers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Выберите поставщиков из списка или создайте нового
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Сохранение...' : 'Сохранить товар'}
            </button>
          </div>
        </form>
      </div>

      {/* Модальное окно создания нового поставщика */}
      <UnifiedSupplierForm
        isOpen={showSupplierForm}
        onClose={() => setShowSupplierForm(false)}
        onSuccess={handleSupplierCreated}
        mode="standalone"
      />
    </div>
  );
};
