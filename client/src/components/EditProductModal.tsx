import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Product, Category } from '../types';
import api from '../utils/api';
import categoryApi from '../services/categoryApi';
import { SendProductImageModal } from './SendProductImageModal';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { ProductFormFields, emptyProductFormData } from './forms/ProductFormFields';
import { toast } from '../context/ToastContext';

type EditProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
};

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyProductFormData());
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showSendImageModal, setShowSendImageModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getCategories({ isActive: true });
      setCategories(data);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        article: product.article,
        internalName: product.internalName || '',
        kaspiName: product.kaspiName || '',
        kaspiArticle: product.kaspiArticle || '',
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        currentStock: product.currentStock?.toString() || '0',
        minStock: product.minStock?.toString() || '0',
        categoryId: product.categoryId?.toString() || '',
        description: product.description || '',
      });
      setCurrentImage(product.image || null);
      setImage(null);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('article', formData.article);
      data.append('internalName', formData.internalName);
      data.append('kaspiName', formData.kaspiName);
      data.append('kaspiArticle', formData.kaspiArticle);
      data.append('costPrice', formData.costPrice);
      data.append('sellingPrice', formData.sellingPrice);
      data.append('currentStock', formData.currentStock);
      data.append('minStock', formData.minStock);
      if (formData.categoryId) {
        data.append('categoryId', formData.categoryId);
      }
      data.append('description', formData.description);

      if (image) {
        data.append('image', image);
      }

      await api.put(`/products/${product.id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Товар обновлён');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Ошибка обновления товара';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Редактировать товар"
        size="lg"
        footer={
          <FormFooter
            onCancel={onClose}
            submitLabel={loading ? 'Сохранение...' : 'Сохранить изменения'}
            submitLoading={loading}
            submitDisabled={loading}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
            className="justify-between"
          >
            <Button
              type="button"
              variant="ghost"
              leftIcon={Send}
              onClick={() => setShowSendImageModal(true)}
              className="mr-auto text-success hover:bg-success-light"
            >
              Отправить фото поставщику
            </Button>
          </FormFooter>
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
            currentImageUrl={currentImage}
            mode="edit"
          />
        </form>
      </Modal>

      <SendProductImageModal
        isOpen={showSendImageModal}
        onClose={() => setShowSendImageModal(false)}
        product={product}
        onSend={() => {
          console.log('Фото отправлено поставщику');
        }}
      />
    </>
  );
};
