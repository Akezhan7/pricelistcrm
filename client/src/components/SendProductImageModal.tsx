import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Product, Supplier } from '../types';
import suppliersApi from '../services/suppliersApi';
import getImageUrl from '../utils/image';
import { toast } from '../context/ToastContext';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Textarea } from './ui/Textarea';
import { FormField } from './ui/FormField';
import { Alert } from './ui/Alert';
import { Spinner } from './ui/Spinner';

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
  onSend,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();

      const defaultMessage = `${product.internalName || product.name}\n\nАртикул: ${product.article || 'нет'}\n\nЦена: ${product.costPrice?.toLocaleString() || '—'} ₸`;
      setMessage(defaultMessage);
    }
  }, [isOpen, product]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.getAllSuppliers();
      const suppliersWithWhatsApp = data.filter((s: Supplier) => s.whatsapp);
      setSuppliers(suppliersWithWhatsApp);
    } catch (error) {
      console.error('Ошибка загрузки поставщиков:', error);
      toast.error('Не удалось загрузить список поставщиков');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!selectedSupplierId) {
      toast.warning('Выберите поставщика');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!selectedSupplier || !selectedSupplier.whatsapp) {
      toast.warning('У выбранного поставщика нет WhatsApp');
      return;
    }

    let fullMessage = message;

    const imageUrl = getImageUrl(product.image);
    if (imageUrl) {
      fullMessage += `\n\nФото: ${imageUrl}`;
    }

    const cleanPhone = selectedSupplier.whatsapp.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappLink, '_blank');

    if (onSend) {
      onSend();
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Отправить фото поставщику"
      size="lg"
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel="Отправить в WhatsApp"
          submitDisabled={!selectedSupplierId || loading}
          onSubmit={handleSend}
          submitType="button"
        />
      }
    >
      <div className="space-y-5">
        <div className="bg-surface-inset rounded-xl p-4 border border-border-subtle">
          <div className="flex items-start gap-4">
            {product.image ? (
              <img
                src={getImageUrl(product.image) || undefined}
                alt={product.name}
                className="w-24 h-24 object-cover rounded-xl border border-border-subtle"
              />
            ) : (
              <div className="w-24 h-24 bg-surface-base rounded-xl flex items-center justify-center border border-border-subtle">
                <ImageIcon className="w-8 h-8 text-text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-brand-black mb-1 truncate">
                {product.internalName || product.name}
              </h3>
              <p className="text-sm text-text-muted">Артикул: {product.article || 'нет'}</p>
              <p className="text-sm text-text-muted">
                Цена: {product.costPrice?.toLocaleString() || '—'} ₸
              </p>
            </div>
          </div>
        </div>

        <FormField label="Выберите поставщика">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="md" color="brand" useLucide />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center text-text-muted py-4">Нет поставщиков с WhatsApp</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-border-subtle rounded-xl p-2 bg-surface-base">
              {suppliers.map((supplier) => (
                <label
                  key={supplier.id}
                  className="flex items-center p-3 bg-surface-base border border-border-subtle rounded-lg cursor-pointer hover:bg-surface-accent transition-colors"
                >
                  <input
                    type="radio"
                    name="supplier"
                    value={supplier.id}
                    checked={selectedSupplierId === supplier.id}
                    onChange={() => setSelectedSupplierId(supplier.id)}
                    className="w-4 h-4 text-brand-yellow focus:ring-brand-yellow"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="font-medium text-brand-black truncate">{supplier.name}</div>
                    <div className="text-sm text-text-muted">{supplier.whatsapp}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </FormField>

        <Textarea
          label="Сообщение (можно отредактировать)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Введите текст сообщения..."
          className="resize-none"
        />

        {!product.image && (
          <Alert variant="warning">
            У товара нет загруженного изображения. Будет отправлен только текст.
          </Alert>
        )}
      </div>
    </Modal>
  );
};
