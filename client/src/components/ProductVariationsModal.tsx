import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Product, ProductVariation } from '../types';
import api from '../utils/api';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { Card, CardBody } from './ui/Card';
import { formatPriceKZT } from '../utils/format';

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
  const { confirm } = useConfirmDialog();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (loadError) {
      console.error('Ошибка загрузки вариаций:', loadError);
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
      const data: Record<string, unknown> = {
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
      const data: Record<string, unknown> = {
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
    if (!product) return;
    const ok = await confirm({
      title: 'Удалить вариацию',
      message: 'Удалить эту вариацию товара?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await api.delete(`/products/${product.id}/variations/${variationId}`);
      await loadVariations();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления вариации');
    } finally {
      setLoading(false);
    }
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingVariation(null);
    resetForm();
    setError('');
  };

  if (!isOpen || !product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Вариации: ${product.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label uppercase tracking-wider text-text-muted">Текущие вариации</p>
            {!showAddForm && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={Plus}
                onClick={() => setShowAddForm(true)}
                disabled={loading}
              >
                Добавить
              </Button>
            )}
          </div>

          {variations.length > 0 ? (
            <div className="space-y-2">
              {variations.map((variation) => (
                <Card key={variation.id} variant="elevated">
                  <CardBody compact className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-medium text-brand-black">
                        {variation.name}: {variation.value}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-caption text-text-muted">
                        <div>
                          <span className="text-label uppercase tracking-wider block mb-0.5">Цена</span>
                          {formatPriceKZT(variation.price)}
                        </div>
                        {variation.costPrice != null && (
                          <div>
                            <span className="text-label uppercase tracking-wider block mb-0.5">
                              Себестоимость
                            </span>
                            {formatPriceKZT(variation.costPrice)}
                          </div>
                        )}
                        {variation.sku && (
                          <div>
                            <span className="text-label uppercase tracking-wider block mb-0.5">
                              Артикул
                            </span>
                            {variation.sku}
                          </div>
                        )}
                        <div>
                          <span className="text-label uppercase tracking-wider block mb-0.5">
                            Порядок
                          </span>
                          {variation.sortOrder}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <IconButton
                        icon={Edit}
                        title="Редактировать"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVariation(variation)}
                        disabled={loading}
                      />
                      <IconButton
                        icon={Trash2}
                        title="Удалить"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariation(variation.id)}
                        disabled={loading}
                        className="text-danger hover:text-danger-dark hover:bg-danger-light/50"
                      />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-caption text-text-muted italic">У этого товара пока нет вариаций</p>
          )}
        </div>

        {showAddForm && (
          <Card variant="inset">
            <CardBody>
              <p className="text-label uppercase tracking-wider text-text-muted mb-4">
                {editingVariation ? 'Редактировать вариацию' : 'Добавить вариацию'}
              </p>
              <form
                onSubmit={editingVariation ? handleUpdateVariation : handleAddVariation}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Название характеристики"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Например: Размер, Цвет"
                  />
                  <Input
                    label="Значение"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Например: XL, Красный"
                  />
                  <Input
                    label="Цена вариации"
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                  <Input
                    label="Себестоимость"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00 (опционально)"
                  />
                  <Input
                    label="Артикул вариации"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="PROD-001-XL"
                  />
                  <Input
                    label="Порядок сортировки"
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <FormFooter
                  onCancel={closeForm}
                  submitLabel={
                    loading
                      ? editingVariation
                        ? 'Обновление...'
                        : 'Создание...'
                      : editingVariation
                        ? 'Обновить вариацию'
                        : 'Создать вариацию'
                  }
                  submitLoading={loading}
                  submitDisabled={loading}
                  className="border-0 px-0 py-0 pt-2"
                />
              </form>
            </CardBody>
          </Card>
        )}

        <Alert variant="info" title="О вариациях товара">
          Вариации позволяют создать различные варианты одного товара с разными ценами.
          Например, футболка может иметь вариации по размерам и цветам — каждая со своей ценой и артикулом.
        </Alert>
      </div>
    </Modal>
  );
};
