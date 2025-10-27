import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, AlertCircle } from 'lucide-react';
import { Product, ProductVariation } from '../types';
import api from '../utils/api';

type ProductVariationsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
};

type VariationFormData = {
  name: string;
  value: string;
  price: string;
  costPrice: string;
  sku: string;
  sortOrder: string;
};

export const ProductVariationsModal: React.FC<ProductVariationsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariation, setEditingVariation] = useState<number | null>(null);
  const [formData, setFormData] = useState<VariationFormData>({
    name: '',
    value: '',
    price: '',
    costPrice: '',
    sku: '',
    sortOrder: '0',
  });

  // Загрузка вариаций при открытии модального окна
  useEffect(() => {
    if (isOpen && product) {
      loadVariations();
    }
  }, [isOpen, product]);

  const loadVariations = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/products/${product.id}/variations`);
      setVariations(response.data.data.variations || []);
    } catch (error) {
      console.error('Ошибка загрузки вариаций:', error);
      setError('Ошибка загрузки вариаций товара');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      value: '',
      price: '',
      costPrice: '',
      sku: '',
      sortOrder: '0',
    });
  };

  const handleAddVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      const data: any = {
        name: formData.name,
        value: formData.value,
        price: parseFloat(formData.price),
        sortOrder: parseInt(formData.sortOrder) || 0,
      };

      if (formData.costPrice) {
        data.costPrice = parseFloat(formData.costPrice);
      }

      if (formData.sku) {
        data.sku = formData.sku;
      }

      await api.post(`/products/${product.id}/variations`, data);

      resetForm();
      setShowAddForm(false);
      await loadVariations();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания вариации');
    } finally {
      setLoading(false);
    }
  };

  const handleEditVariation = (variation: ProductVariation) => {
    setEditingVariation(variation.id);
    setFormData({
      name: variation.name,
      value: variation.value,
      price: variation.price.toString(),
      costPrice: variation.costPrice?.toString() || '',
      sku: variation.sku || '',
      sortOrder: variation.sortOrder.toString(),
    });
    setShowAddForm(true);
  };

  const handleUpdateVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !editingVariation) return;

    setLoading(true);
    setError('');

    try {
      const data: any = {
        name: formData.name,
        value: formData.value,
        price: parseFloat(formData.price),
        sortOrder: parseInt(formData.sortOrder) || 0,
      };

      if (formData.costPrice) {
        data.costPrice = parseFloat(formData.costPrice);
      }

      if (formData.sku) {
        data.sku = formData.sku;
      }

      // ИСПРАВЛЕНО: Теперь используем реальные PUT и DELETE эндпоинты
      await api.put(`/products/${product.id}/variations/${editingVariation}`, data);

      resetForm();
      setShowAddForm(false);
      setEditingVariation(null);
      await loadVariations();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка обновления вариации');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariation = async (variationId: number) => {
    if (!product || !window.confirm('Удалить эту вариацию товара?')) return;

    setLoading(true);
    try {
      // Эндпоинт для удаления вариации (нужно будет добавить в контроллер)
      await api.delete(`/products/${product.id}/variations/${variationId}`);
      await loadVariations();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления вариации');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Вариации товара: {product.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[calc(90vh-8rem)] overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Существующие вариации */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Текущие вариации</h3>
            {variations.length > 0 ? (
              <div className="space-y-3">
                {variations.map((variation) => (
                  <div key={variation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-2">
                          {variation.name}: {variation.value}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Цена:</span> {variation.price} ₽
                          </div>
                          {variation.costPrice && (
                            <div>
                              <span className="font-medium">Себестоимость:</span> {variation.costPrice} ₽
                            </div>
                          )}
                          {variation.sku && (
                            <div>
                              <span className="font-medium">Артикул:</span> {variation.sku}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Порядок:</span> {variation.sortOrder}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditVariation(variation)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать"
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVariation(variation.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">У этого товара пока нет вариаций</p>
            )}
          </div>

          {/* Форма добавления/редактирования вариации */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900">
                {editingVariation ? 'Редактировать вариацию' : 'Добавить вариацию'}
              </h3>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                  Добавить вариацию
                </button>
              )}
            </div>

            {showAddForm && (
              <form 
                onSubmit={editingVariation ? handleUpdateVariation : handleAddVariation} 
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название характеристики *
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Например: Размер, Цвет, Материал"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Значение *
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="Например: XL, Красный, Пластик"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена вариации *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Себестоимость
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      placeholder="0.00 (опционально)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Артикул вариации
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Например: PROD-001-XL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Порядок сортировки
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingVariation(null);
                      resetForm();
                      setError('');
                    }}
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
                    <Save className="h-4 w-4" />
                    {loading 
                      ? (editingVariation ? 'Обновление...' : 'Создание...') 
                      : (editingVariation ? 'Обновить вариацию' : 'Создать вариацию')
                    }
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Информационная подсказка */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">О вариациях товара</h4>
            <p className="text-sm text-blue-700">
              Вариации позволяют создать различные варианты одного товара с разными ценами. 
              Например, футболка может иметь вариации по размерам (S, M, L, XL) и цветам (красный, синий, зеленый).
              Каждая вариация может иметь свою собственную цену и артикул.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
