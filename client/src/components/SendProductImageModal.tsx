import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon } from 'lucide-react';
import { Product, Supplier } from '../types';
import suppliersApi from '../services/suppliersApi';
import getImageUrl from '../utils/image';

interface SendProductImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSend?: () => void;
}

export const SendProductImageModal: React.FC<SendProductImageModalProps> = ({
  isOpen,
  onClose,
  product,
  onSend
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      
      // Формируем начальное сообщение
      const defaultMessage = `${product.internalName || product.name}\n\nАртикул: ${product.article || 'нет'}\n\nЦена: ${product.costPrice?.toLocaleString() || '—'} ₸`;
      setMessage(defaultMessage);
    }
  }, [isOpen, product]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.getAllSuppliers();
      // Фильтруем только поставщиков с WhatsApp
      const suppliersWithWhatsApp = data.filter((s: Supplier) => s.whatsapp);
      setSuppliers(suppliersWithWhatsApp);
    } catch (error) {
      console.error('Ошибка загрузки поставщиков:', error);
      alert('Не удалось загрузить список поставщиков');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!selectedSupplierId) {
      alert('Выберите поставщика');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier || !selectedSupplier.whatsapp) {
      alert('У выбранного поставщика нет WhatsApp');
      return;
    }

    // Формируем текст сообщения
    let fullMessage = message;

    // Публичная ссылка на API (/uploads), без авторизации
    const imageUrl = getImageUrl(product.image);
    if (imageUrl) {
      fullMessage += `\n\nФото: ${imageUrl}`;
    }

    // Очищаем номер телефона от спецсимволов
    const cleanPhone = selectedSupplier.whatsapp.replace(/\D/g, '');

    // Кодируем текст для URL
    const encodedMessage = encodeURIComponent(fullMessage);

    // Формируем WhatsApp deep link
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // Открываем WhatsApp в новой вкладке
    window.open(whatsappLink, '_blank');

    // Вызываем callback если нужно
    if (onSend) {
      onSend();
    }

    // Закрываем модалку
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Send className="w-6 h-6 mr-2 text-green-600" />
            Отправить фото поставщику
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Содержимое */}
        <div className="p-6 space-y-6">
          {/* Информация о товаре */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-4">
              {product.image ? (
                <img
                  src={getImageUrl(product.image) || undefined}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {product.internalName || product.name}
                </h3>
                <p className="text-sm text-gray-600">Артикул: {product.article || 'нет'}</p>
                <p className="text-sm text-gray-600">
                  Цена: {product.costPrice?.toLocaleString() || '—'} ₸
                </p>
              </div>
            </div>
          </div>

          {/* Выбор поставщика */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите поставщика
            </label>
            {loading ? (
              <div className="text-center text-gray-600 py-4">Загрузка...</div>
            ) : suppliers.length === 0 ? (
              <div className="text-center text-gray-600 py-4">
                Нет поставщиков с WhatsApp
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {suppliers.map(supplier => (
                  <label
                    key={supplier.id}
                    className="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:bg-green-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="supplier"
                      value={supplier.id}
                      checked={selectedSupplierId === supplier.id}
                      onChange={() => setSelectedSupplierId(supplier.id)}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.whatsapp}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Текст сообщения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Сообщение (можно отредактировать)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Введите текст сообщения..."
            />
          </div>

          {!product.image && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ У товара нет загруженного изображения. Будет отправлен только текст.
              </p>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedSupplierId || loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Отправить в WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
