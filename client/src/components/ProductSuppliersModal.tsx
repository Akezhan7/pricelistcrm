import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit, Check, AlertCircle, UserPlus, Users } from 'lucide-react';
import { Product, Supplier, SupplierWithPrice } from '../types';
import { UnifiedSupplierForm } from './UnifiedSupplierForm';
import api from '../utils/api';

type ProductSuppliersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
};

type NewSupplierData = {
  supplierId: string;
  supplierPrice: string;
  quantity: string;
  isAvailable: boolean;
  notes: string;
};

export const ProductSuppliersModal: React.FC<ProductSuppliersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionType, setActionType] = useState<'existing' | 'create' | null>(null);
  
  const [newSupplierData, setNewSupplierData] = useState<NewSupplierData>({
    supplierId: '',
    supplierPrice: '',
    quantity: '0',
    isAvailable: true,
    notes: '',
  });
  
  const [editingSupplier, setEditingSupplier] = useState<number | null>(null);
  const [editData, setEditData] = useState<Omit<NewSupplierData, 'supplierId'>>({
    supplierPrice: '',
    quantity: '0',
    isAvailable: true,
    notes: '',
  });

  // Загрузка списка доступных поставщиков при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadAvailableSuppliers();
    }
  }, [isOpen]);

  const loadAvailableSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setAvailableSuppliers(response.data.data.suppliers || []);
    } catch (error) {
      console.error('Ошибка загрузки поставщиков:', error);
    }
  };

  // Функция для получения поставщиков, которые еще не привязаны к товару
  const getUnlinkedSuppliers = () => {
    if (!product?.suppliers) return availableSuppliers;
    
    const linkedSupplierIds = product.suppliers.map(s => s.id);
    return availableSuppliers.filter(s => !linkedSupplierIds.includes(s.id));
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      await api.post(`/products/${product.id}/suppliers`, {
        supplierId: parseInt(newSupplierData.supplierId),
        supplierPrice: parseFloat(newSupplierData.supplierPrice),
        quantity: parseInt(newSupplierData.quantity),
        isAvailable: newSupplierData.isAvailable,
        notes: newSupplierData.notes,
      });

      // Сброс формы
      setNewSupplierData({
        supplierId: '',
        supplierPrice: '',
        quantity: '0',
        isAvailable: true,
        notes: '',
      });
      setShowAddForm(false);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка добавления поставщика');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSupplier = async (supplierId: number) => {
    if (!product || !window.confirm('Удалить поставщика из этого товара?')) return;

    setLoading(true);
    try {
      await api.delete(`/products/${product.id}/suppliers/${supplierId}`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления поставщика');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSupplier = (supplier: SupplierWithPrice) => {
    setEditingSupplier(supplier.id);
    setEditData({
      supplierPrice: supplier.ProductSupplier.supplierPrice.toString(),
      quantity: supplier.ProductSupplier.quantity.toString(),
      isAvailable: supplier.ProductSupplier.isAvailable,
      notes: supplier.ProductSupplier.notes || '',
    });
  };

  const handleSaveEdit = async (supplierId: number) => {
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      await api.put(`/products/${product.id}/suppliers/${supplierId}`, {
        supplierPrice: parseFloat(editData.supplierPrice),
        quantity: parseInt(editData.quantity),
        isAvailable: editData.isAvailable,
        notes: editData.notes,
      });

      setEditingSupplier(null);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка обновления данных поставщика');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplierCompletely = async (supplierId: number, supplierName: string) => {
    if (!window.confirm(`Полностью удалить поставщика "${supplierName}" из базы данных? Это действие необратимо и удалит поставщика из всех товаров.`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/suppliers/${supplierId}/permanent`);
      await loadAvailableSuppliers(); // Обновляем список поставщиков
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления поставщика');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const unlinkedSuppliers = getUnlinkedSuppliers();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Поставщики товара: {product.name}
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

          {/* Текущие поставщики */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">Текущие поставщики</h3>
            {product.suppliers && product.suppliers.length > 0 ? (
              <div className="space-y-3">
                {product.suppliers.map((supplier) => (
                  <div key={supplier.id} className="border border-gray-200 rounded-lg p-4">
                    {editingSupplier === supplier.id ? (
                      // Форма редактирования
                      <div className="space-y-3">
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Цена поставщика
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="input-field"
                              value={editData.supplierPrice}
                              onChange={(e) => setEditData({ ...editData, supplierPrice: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Количество
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="input-field"
                              value={editData.quantity}
                              onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Доступен
                            </label>
                            <select
                              className="input-field"
                              value={editData.isAvailable.toString()}
                              onChange={(e) => setEditData({ ...editData, isAvailable: e.target.value === 'true' })}
                            >
                              <option value="true">Да</option>
                              <option value="false">Нет</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Заметки
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            value={editData.notes}
                            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                            placeholder="Дополнительные заметки..."
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingSupplier(null)}
                            className="btn-secondary"
                            disabled={loading}
                          >
                            Отмена
                          </button>
                          <button
                            onClick={() => handleSaveEdit(supplier.id)}
                            className="btn-primary flex items-center gap-2"
                            disabled={loading}
                          >
                            <Check className="h-4 w-4" />
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Просмотр данных поставщика
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">{supplier.name}</div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Цена:</span> {supplier.ProductSupplier.supplierPrice} ₽
                            </div>
                            <div>
                              <span className="font-medium">Количество:</span> {supplier.ProductSupplier.quantity}
                            </div>
                            <div>
                              <span className="font-medium">Доступен:</span>{' '}
                              <span className={supplier.ProductSupplier.isAvailable ? 'text-green-600' : 'text-red-600'}>
                                {supplier.ProductSupplier.isAvailable ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Телефон:</span> {supplier.phone}
                            </div>
                          </div>
                          {supplier.ProductSupplier.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Заметки:</span> {supplier.ProductSupplier.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-1 ml-4">
                          <button
                            onClick={() => handleEditSupplier(supplier)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveSupplier(supplier.id)}
                            className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Удалить из товара"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplierCompletely(supplier.id, supplier.name)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Полностью удалить из базы данных"
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">У этого товара пока нет поставщиков</p>
            )}
          </div>

          {/* Управление поставщиками */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900">Управление поставщиками</h3>
              {!showAddForm && !showCreateForm && (
                <div className="flex space-x-3">
                  {unlinkedSuppliers.length > 0 && (
                    <button
                      onClick={() => {
                        setActionType('existing');
                        setShowAddForm(true);
                      }}
                      className="btn-secondary flex items-center gap-2"
                      disabled={loading}
                    >
                      <Users className="h-4 w-4" />
                      Выбрать существующего поставщика
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActionType('create');
                      setShowCreateForm(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                    disabled={loading}
                  >
                    <UserPlus className="h-4 w-4" />
                    Создать нового поставщика
                  </button>
                </div>
              )}
            </div>

            {/* Форма выбора существующего поставщика */}
            {showAddForm && actionType === 'existing' && (
              <form onSubmit={handleAddSupplier} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Выбрать существующего поставщика</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Поставщик *
                    </label>
                    <select
                      required
                      className="input-field"
                      value={newSupplierData.supplierId}
                      onChange={(e) => setNewSupplierData({ ...newSupplierData, supplierId: e.target.value })}
                    >
                      <option value="">Выберите поставщика</option>
                      {unlinkedSuppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} - {supplier.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена поставщика для этого товара *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={newSupplierData.supplierPrice}
                      onChange={(e) => setNewSupplierData({ ...newSupplierData, supplierPrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Количество на складе у поставщика
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={newSupplierData.quantity}
                      onChange={(e) => setNewSupplierData({ ...newSupplierData, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Доступность
                    </label>
                    <select
                      className="input-field"
                      value={newSupplierData.isAvailable.toString()}
                      onChange={(e) => setNewSupplierData({ ...newSupplierData, isAvailable: e.target.value === 'true' })}
                    >
                      <option value="true">Доступен</option>
                      <option value="false">Недоступен</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заметки для этого товара
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newSupplierData.notes}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, notes: e.target.value })}
                    placeholder="Особые условия поставки, заметки о качестве и т.д."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setActionType(null);
                      setNewSupplierData({
                        supplierId: '',
                        supplierPrice: '',
                        quantity: '0',
                        isAvailable: true,
                        notes: '',
                      });
                    }}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Добавление...' : 'Добавить существующего поставщика'}
                  </button>
                </div>
              </form>
            )}

            {/* Информационные сообщения */}
            {!showAddForm && !showCreateForm && (
              <div>
                {unlinkedSuppliers.length === 0 && (
                  <p className="text-gray-500 italic mb-2">Все доступные поставщики уже привязаны к этому товару</p>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Управление поставщиками</h4>
                  <p className="text-sm text-blue-700">
                    • <strong>Выбрать существующего поставщика</strong> - добавить к товару поставщика из уже созданных в системе<br/>
                    • <strong>Создать нового поставщика</strong> - создать нового поставщика и сразу добавить его к товару<br/>
                    • <strong>Удалить из товара</strong> - убрать поставщика только из этого товара (желтая кнопка)<br/>
                    • <strong>Полностью удалить</strong> - удалить поставщика из всех товаров и из базы данных (красная кнопка)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Унифицированная форма создания поставщика */}
      <UnifiedSupplierForm
        isOpen={showCreateForm && actionType === 'create'}
        onClose={() => {
          setShowCreateForm(false);
          setActionType(null);
        }}
        onSuccess={async () => {
          await loadAvailableSuppliers();
          onSuccess();
          setShowCreateForm(false);
          setActionType(null);
        }}
        mode="with-product"
        productId={product?.id}
        productName={product?.name}
      />
    </div>
  );
};
