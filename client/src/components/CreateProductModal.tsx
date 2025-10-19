import React, { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import api from '../utils/api';

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
    costPrice: '',
    sellingPrice: '',
    description: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('article', formData.article);
      data.append('costPrice', formData.costPrice);
      data.append('sellingPrice', formData.sellingPrice);
      data.append('description', formData.description);
      
      if (image) {
        data.append('image', image);
      }

      await api.post('/products', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Очистка формы
      setFormData({
        name: '',
        article: '',
        costPrice: '',
        sellingPrice: '',
        description: '',
      });
      setImage(null);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания товара');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Добавить товар</h2>
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
    </div>
  );
};
