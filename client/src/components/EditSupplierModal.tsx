import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Plus } from 'lucide-react';
import { Supplier } from '../types';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import { MarketManagementModal } from './MarketManagementModal';

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
  const [markets, setMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    marketId: '',
    row: '',
    container: '',
    cityAddress: '',
    phone: '',
    whatsapp: '',
    notes: '',
    debt: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // Загрузка рынков при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadMarkets();
    }
  }, [isOpen]);

  const loadMarkets = async () => {
    setLoadingMarkets(true);
    try {
      const response = await api.get('/markets');
      setMarkets(response.data.data.markets || []);
    } catch (err) {
      console.error('Ошибка загрузки рынков:', err);
    } finally {
      setLoadingMarkets(false);
    }
  };

  // Заполнение формы при открытии модального окна
  useEffect(() => {
    if (supplier) {
      // Определяем cityAddress: если поставщик на рынке, используем пустую строку
      // если не на рынке - используем address
      const cityAddress = supplier.marketId ? '' : (supplier.address || '');
      
      setFormData({
        name: supplier.name || '',
        marketId: supplier.marketId ? String(supplier.marketId) : '',
        row: supplier.row !== undefined && supplier.row !== null ? String(supplier.row) : '',
        container: supplier.container !== undefined && supplier.container !== null ? String(supplier.container) : '',
        cityAddress: cityAddress,
        phone: supplier.phone || '',
        whatsapp: supplier.whatsapp || '',
        notes: supplier.notes || '',
        debt: supplier.debt !== undefined ? supplier.debt.toString() : '0',
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
      // Формируем адрес в зависимости от того, на рынке ли поставщик
      let address = '';
      
      if (formData.marketId) {
        // Поставщик на рынке - используем ряд/контейнер
        if (formData.row && formData.container) {
          address = `Ряд ${formData.row}, Контейнер ${formData.container}`;
        } else if (formData.row) {
          address = `Ряд ${formData.row}`;
        } else if (formData.container) {
          address = `Контейнер ${formData.container}`;
        }
      } else {
        // Поставщик не на рынке - используем городской адрес
        address = formData.cityAddress;
      }

      const data = new FormData();
      data.append('name', formData.name);
      data.append('marketId', formData.marketId || '');
      data.append('address', address);
      
      // Всегда отправляем row и container (даже пустые строки), чтобы очистить старые значения
      if (formData.marketId) {
        // Если на рынке - отправляем ряд и контейнер (или пустые строки)
        data.append('row', formData.row || '');
        data.append('container', formData.container || '');
      } else {
        // Если не на рынке - явно очищаем ряд и контейнер
        data.append('row', '');
        data.append('container', '');
      }
      
      data.append('phone', formData.phone);
      data.append('whatsapp', formData.whatsapp || formData.phone);
      data.append('notes', formData.notes);
      data.append('debt', formData.debt);
      
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

  // Обработчик изменения рынка - очищаем неактуальные поля
  const handleMarketChange = (newMarketId: string) => {
    if (newMarketId) {
      // Переключились на рынок - очищаем городской адрес
      setFormData({ 
        ...formData, 
        marketId: newMarketId,
        cityAddress: ''
      });
    } else {
      // Переключились на "не на рынке" - очищаем ряд и контейнер
      setFormData({ 
        ...formData, 
        marketId: '',
        row: '',
        container: ''
      });
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

          {/* Выбор рынка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Рынок (опционально)
            </label>
            <div className="flex gap-2">
              {loadingMarkets ? (
                <div className="input-field flex-1 flex items-center gap-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Загрузка рынков...
                </div>
              ) : (
                <select
                  className="input-field flex-1"
                  value={formData.marketId}
                  onChange={(e) => handleMarketChange(e.target.value)}
                >
                  <option value="">Не на рынке / Где-то в городе</option>
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setShowMarketModal(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                title="Управление рынками"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Если поставщик на Байсате, Ялянь или другом рынке - выберите рынок
            </p>
          </div>

          {/* Условное отображение полей в зависимости от выбора рынка */}
          {formData.marketId ? (
            // Поставщик на рынке - показываем ряд/контейнер
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
              </div>
            </div>
          ) : (
            // Поставщик не на рынке - показываем городской адрес
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес в городе *
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.cityAddress}
                onChange={(e) => setFormData({ ...formData, cityAddress: e.target.value })}
                placeholder="Укажите полный адрес"
                required={!formData.marketId}
              />
            </div>
          )}

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
              placeholder="+7 777 123 45 67"
            />
            <p className="text-xs text-gray-500 mt-1">
              Если отличается от телефона
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

      <MarketManagementModal
        isOpen={showMarketModal}
        onClose={() => setShowMarketModal(false)}
        onMarketsUpdated={loadMarkets}
      />
    </div>
  );
};
