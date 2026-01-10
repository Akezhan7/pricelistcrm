import React, { useState } from 'react';
import { X, Save, Upload, Building2 } from 'lucide-react';
import api from '../utils/api';

type UnifiedSupplierFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'standalone' | 'with-product'; // standalone - просто создать поставщика, with-product - создать и привязать к товару
  productId?: number; // ID товара, если mode === 'with-product'
  productName?: string; // Название товара для отображения
  initialProductData?: {
    supplierPrice?: string;
    quantity?: string;
    isAvailable?: boolean;
    notes?: string;
  };
};

type SupplierFormData = {
  name: string;
  phone: string;
  whatsapp: string;
  row: string;
  container: string;
  notes: string;
  containerImage: File | null;
};

type ProductLinkData = {
  supplierPrice: string;
  quantity: string;
  isAvailable: boolean;
  notes: string;
};

export const UnifiedSupplierForm: React.FC<UnifiedSupplierFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
  productId,
  productName,
  initialProductData,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Данные поставщика
  const [supplierData, setSupplierData] = useState<SupplierFormData>({
    name: '',
    phone: '',
    whatsapp: '',
    row: '',
    container: '',
    notes: '',
    containerImage: null,
  });

  // Данные привязки к товару (только для режима with-product)
  const [productLinkData, setProductLinkData] = useState<ProductLinkData>({
    supplierPrice: initialProductData?.supplierPrice || '',
    quantity: initialProductData?.quantity || '0',
    isAvailable: initialProductData?.isAvailable ?? true,
    notes: initialProductData?.notes || '',
  });

  const resetForm = () => {
    setSupplierData({
      name: '',
      phone: '',
      whatsapp: '',
      row: '',
      container: '',
      notes: '',
      containerImage: null,
    });
    setProductLinkData({
      supplierPrice: '',
      quantity: '0',
      isAvailable: true,
      notes: '',
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Формируем адрес из ряда и контейнера
      let address = '';
      if (supplierData.row && supplierData.container) {
        address = `Ряд ${supplierData.row}, Контейнер ${supplierData.container}`;
      } else if (supplierData.row) {
        address = `Ряд ${supplierData.row}`;
      } else if (supplierData.container) {
        address = `Контейнер ${supplierData.container}`;
      } else {
        setError('Укажите хотя бы номер ряда или контейнера');
        setLoading(false);
        return;
      }

      // Создаём FormData для отправки с файлом
      const formData = new FormData();
      formData.append('name', supplierData.name.trim());
      formData.append('phone', supplierData.phone.trim());
      formData.append('whatsapp', supplierData.whatsapp.trim() || supplierData.phone.trim());
      formData.append('address', address);
      
      if (supplierData.row) {
        formData.append('row', supplierData.row.trim());
      }
      if (supplierData.container) {
        formData.append('container', supplierData.container.trim());
      }
      if (supplierData.notes.trim()) {
        formData.append('notes', supplierData.notes.trim());
      }
      if (supplierData.containerImage) {
        formData.append('containerImage', supplierData.containerImage);
      }

      // Создаём поставщика
      const supplierResponse = await api.post('/suppliers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newSupplierId = supplierResponse.data.data.supplier.id;

      // Если режим with-product, привязываем поставщика к товару
      if (mode === 'with-product' && productId) {
        await api.post(`/products/${productId}/suppliers`, {
          supplierId: newSupplierId,
          supplierPrice: parseFloat(productLinkData.supplierPrice) || 0,
          quantity: parseInt(productLinkData.quantity) || 0,
          isAvailable: productLinkData.isAvailable,
          notes: productLinkData.notes.trim(),
        });
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания поставщика');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Создать нового поставщика
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Контент с прокруткой */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Индикатор режима */}
            {mode === 'with-product' && productName && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Поставщик будет автоматически привязан к товару: <strong>{productName}</strong>
              </div>
            )}

            {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Основная информация
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя поставщика <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={supplierData.name}
                  onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value })}
                  placeholder="Например: Юсуф, Рустам"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    value={supplierData.phone}
                    onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
                    placeholder="+7 777 123 45 67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={supplierData.whatsapp}
                    onChange={(e) => setSupplierData({ ...supplierData, whatsapp: e.target.value })}
                    placeholder="+7 777 123 45 67"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Если отличается от телефона
                  </p>
                </div>
              </div>
            </div>

            {/* МЕСТОПОЛОЖЕНИЕ */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Местоположение на рынке
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер ряда <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!supplierData.container}
                    className="input-field"
                    value={supplierData.row}
                    onChange={(e) => setSupplierData({ ...supplierData, row: e.target.value })}
                    placeholder="Например: 24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер контейнера
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={supplierData.container}
                    onChange={(e) => setSupplierData({ ...supplierData, container: e.target.value })}
                    placeholder="Например: 6"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Укажите хотя бы номер ряда или контейнера для точного поиска поставщика
              </p>
            </div>

            {/* ФОТО КОНТЕЙНЕРА */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Фото контейнера (опционально)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors bg-white">
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
                        onChange={(e) => setSupplierData({ 
                          ...supplierData, 
                          containerImage: e.target.files?.[0] || null 
                        })}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG до 5MB</p>
                  {supplierData.containerImage && (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      ✓ Выбрано: {supplierData.containerImage.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ЗАМЕТКИ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заметки (опционально)
              </label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={supplierData.notes}
                onChange={(e) => setSupplierData({ ...supplierData, notes: e.target.value })}
                placeholder="Дополнительные заметки о поставщике..."
              />
            </div>

            {/* УСЛОВИЯ ДЛЯ ТОВАРА (только если mode === 'with-product') */}
            {mode === 'with-product' && productId && (
              <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Условия для товара
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={productLinkData.supplierPrice}
                      onChange={(e) => setProductLinkData({ ...productLinkData, supplierPrice: e.target.value })}
                      placeholder="0.00"
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
                      value={productLinkData.quantity}
                      onChange={(e) => setProductLinkData({ ...productLinkData, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Доступность
                    </label>
                    <select
                      className="input-field"
                      value={productLinkData.isAvailable.toString()}
                      onChange={(e) => setProductLinkData({ ...productLinkData, isAvailable: e.target.value === 'true' })}
                    >
                      <option value="true">Доступен</option>
                      <option value="false">Недоступен</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заметки для этого товара
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={productLinkData.notes}
                    onChange={(e) => setProductLinkData({ ...productLinkData, notes: e.target.value })}
                    placeholder="Особые условия, заметки о качестве..."
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Футер с кнопками */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Создание...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {mode === 'with-product' ? 'Создать и добавить к товару' : 'Создать поставщика'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
