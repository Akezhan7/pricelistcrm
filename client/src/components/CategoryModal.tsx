import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import categoryApi from '../services/categoryApi';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Alert } from './ui/Alert';

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category: Category | null;
  categories: Category[];
};

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  category,
  categories,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    isActive: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        parentId: category.parentId?.toString() || '',
        isActive: category.isActive,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        parentId: '',
        isActive: true,
      });
    }
    setError('');
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        parentId: formData.parentId ? Number(formData.parentId) : undefined,
        isActive: formData.isActive,
      };

      if (category) {
        await categoryApi.updateCategory(category.id, data);
      } else {
        await categoryApi.createCategory(data);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения категории');
    } finally {
      setLoading(false);
    }
  };

  const availableParentCategories = categories.filter(
    (c) => !category || c.id !== category.id
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Редактировать категорию' : 'Новая категория'}
      size="sm"
      footer={
        <FormFooter
          onCancel={onClose}
          submitLabel={loading ? 'Сохранение...' : 'Сохранить'}
          submitLoading={loading}
          submitDisabled={loading}
          onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label="Название категории *"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Маски сварочные"
        />

        <Select
          label="Родительская категория"
          value={formData.parentId}
          onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
          helperText="Выберите родительскую категорию для создания подкатегории"
        >
          <option value="">Корневая категория</option>
          {availableParentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>

        <Textarea
          label="Описание"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Краткое описание категории..."
        />

        <div className="flex items-center gap-2.5 p-3 bg-surface-inset rounded-lg border border-border-subtle">
          <input
            type="checkbox"
            id="isActive"
            className="h-4 w-4 text-brand-yellow focus:ring-brand-yellow border-border-subtle rounded"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <label htmlFor="isActive" className="text-body text-brand-black">
            Активная категория
          </label>
        </div>
      </form>
    </Modal>
  );
};
