import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Plus } from 'lucide-react';
import { Supplier } from '../types';
import api from '../utils/api';
import getImageUrl from '../utils/image';

type Sector = {
  id: number;
  name: string;
  code: string;
  productType: string;
  color?: string;
  icon?: string;
};

type EditSupplierModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
};

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
  address: '',
  row: '',
  container: '',
    phone: '',
    whatsapp: '',
    sector: '',
    notes: '',
    debt: '',
    mapPosition: {
      x: '',
      y: '',
    },
  });
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // Состояния для работы с секторами
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [showAddSector, setShowAddSector] = useState(false);
  const [newSector, setNewSector] = useState({
    name: '',
    code: '',
    productType: '',
    color: '#6b7280',
  });
  const [addingSector, setAddingSector] = useState(false);

  // Загрузка секторов при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadSectors();
    }
  }, [isOpen]);

  const loadSectors = async () => {
    try {
      setLoadingSectors(true);
      const response = await api.get('/sectors');
      setSectors(response.data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки секторов:', err);
    } finally {
      setLoadingSectors(false);
    }
  };

  const handleAddSector = async () => {
    if (!newSector.name.trim() || !newSector.code.trim() || !newSector.productType.trim()) {
      setError('Заполните все поля нового сектора');
      return;
    }

    try {
      setAddingSector(true);
      setError('');
      
      const response = await api.post('/sectors', {
        name: newSector.name,
        code: newSector.code,
        productType: newSector.productType,
        color: newSector.color,
      });

      const createdSector = response.data.data;
      
      // Обновляем список секторов
      setSectors([...sectors, createdSector]);
      
      // Автоматически выбираем новый сектор
      setFormData({ ...formData, sector: createdSector.name });
      
      // Сбрасываем форму добавления сектора
      setNewSector({
        name: '',
        code: '',
        productType: '',
        color: '#6b7280',
      });
      setShowAddSector(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания сектора');
    } finally {
      setAddingSector(false);
    }
  };

  // Заполнение формы при открытии модального окна
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
  address: supplier.address,
  row: supplier.row ? String(supplier.row) : '',
  container: supplier.container ? String(supplier.container) : '',
        phone: supplier.phone,
        whatsapp: supplier.whatsapp || '',
        sector: supplier.sector || '',
        notes: supplier.notes || '',
        debt: supplier.debt.toString(),
        mapPosition: {
          x: supplier.mapPosition?.x?.toString() || '',
          y: supplier.mapPosition?.y?.toString() || '',
        },
      });
      setCurrentImage(supplier.containerImage || null);
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
  if (formData.address) data.append('address', formData.address);
  if (formData.row) data.append('row', formData.row);
  if (formData.container) data.append('container', formData.container);
      data.append('phone', formData.phone);
      data.append('whatsapp', formData.whatsapp);
      data.append('sector', formData.sector);
      data.append('notes', formData.notes);
      data.append('debt', formData.debt);
      
      // Добавляем позицию на карте, если указана
      if (formData.mapPosition.x && formData.mapPosition.y) {
        const mapPosition = {
          x: parseFloat(formData.mapPosition.x),
          y: parseFloat(formData.mapPosition.y),
        };
        data.append('mapPosition', JSON.stringify(mapPosition));
      }
      
      if (image) {
        data.append('containerImage', image);
      }

      await api.put(`/suppliers/${supplier.id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка обновления поставщика');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Редактировать поставщика</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя поставщика *
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Ряд и Контейнер — сразу после имени */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ряд</label>
              <input
                type="text"
                className="input-field"
                value={formData.row}
                onChange={(e) => setFormData({ ...formData, row: e.target.value })}
                placeholder="Напр.: 24"
              />
              <p className="text-xs text-gray-500 mt-1">Номер ряда на рынке (опционально)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Контейнер</label>
              <input
                type="text"
                className="input-field"
                value={formData.container}
                onChange={(e) => setFormData({ ...formData, container: e.target.value })}
                placeholder="Напр.: 6"
              />
              <p className="text-xs text-gray-500 mt-1">Номер контейнера (опционально)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Адрес (опционально)
            </label>
            <input
              type="text"
              className="input-field"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Можно оставить пустым, если указан ряд/контейнер</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон *
            </label>
            <input
              type="tel"
              required
              className="input-field"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp
            </label>
            <input
              type="tel"
              className="input-field"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сектор
            </label>
            <div className="flex gap-2">
              <select
                className="input-field flex-1"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                disabled={loadingSectors}
              >
                <option value="">
                  {loadingSectors ? 'Загрузка секторов...' : 'Выберите сектор'}
                </option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.name}>
                    {sector.name} ({sector.productType})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddSector(!showAddSector)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                title="Добавить новый сектор"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {/* Форма быстрого добавления сектора */}
            {showAddSector && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Добавить новый сектор</h4>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Название сектора *
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Например: Игрушки"
                    value={newSector.name}
                    onChange={(e) => setNewSector({ ...newSector, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Код сектора *
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Например: TOY"
                    value={newSector.code}
                    onChange={(e) => setNewSector({ ...newSector, code: e.target.value.toUpperCase() })}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Тип продукции *
                  </label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Например: Детские товары"
                    value={newSector.productType}
                    onChange={(e) => setNewSector({ ...newSector, productType: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Цвет (опционально)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                      value={newSector.color}
                      onChange={(e) => setNewSector({ ...newSector, color: e.target.value })}
                    />
                    <span className="text-xs text-gray-500">
                      Цвет для отображения на карте
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSector(false);
                      setNewSector({
                        name: '',
                        code: '',
                        productType: '',
                        color: '#6b7280',
                      });
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={addingSector}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSector}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    disabled={addingSector}
                  >
                    {addingSector ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Добавление...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        Добавить сектор
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Выберите категорию товаров для правильного отображения на карте
            </p>
          </div>

          {/* Позиция на карте */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Позиция на карте (опционально)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="input-field"
                  placeholder="X (0-100)"
                  value={formData.mapPosition.x}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mapPosition: { ...formData.mapPosition, x: e.target.value } 
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">Координата X (0-100%)</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="input-field"
                  placeholder="Y (0-100)"
                  value={formData.mapPosition.y}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mapPosition: { ...formData.mapPosition, y: e.target.value } 
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">Координата Y (0-100%)</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Укажите позицию контейнера на карте в процентах от левого верхнего угла
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Задолженность (₸)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={formData.debt}
              onChange={(e) => setFormData({ ...formData, debt: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Сумма, которую вы должны поставщику
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заметки
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Фото контейнера
            </label>
            
            {/* Текущее изображение */}
            {currentImage && !image && (
              <div className="mb-3">
                <img
                  src={getImageUrl(currentImage) || undefined}
                  alt="Текущее изображение"
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = '/placeholder.svg'; }}
                />
                <p className="text-xs text-gray-500 mt-1">Текущее изображение</p>
              </div>
            )}

            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      {currentImage ? 'Изменить изображение' : 'Выберите файл'}
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
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
