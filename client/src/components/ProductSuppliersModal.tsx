import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit, UserPlus, Users } from 'lucide-react';
import { Product, Supplier, SupplierWithPrice } from '../types';
import { SupplierFormModal } from './SupplierFormModal';
import { Modal } from './ui/Modal';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Card, CardBody } from './ui/Card';
import { FormFooter } from './ui/FormFooter';
import api from '../utils/api';
import { useConfirmDialog } from '../context/ConfirmDialogContext';

type ProductSuppliersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
  /** При открытии со страницы поставщика — выделить и сразу редактировать его цену */
  contextSupplierId?: number;
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
  contextSupplierId,
}) => {
  const { confirm } = useConfirmDialog();
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

  const sortedSuppliers = useMemo(() => {
    if (!product?.suppliers?.length) return [];
    const list = [...product.suppliers];
    if (contextSupplierId) {
      list.sort((a, b) => {
        if (a.id === contextSupplierId) return -1;
        if (b.id === contextSupplierId) return 1;
        return 0;
      });
    }
    return list;
  }, [product?.suppliers, contextSupplierId]);

  useEffect(() => {
    if (isOpen) {
      loadAvailableSuppliers();
      return;
    }
    setEditingSupplier(null);
    setShowAddForm(false);
    setShowCreateForm(false);
    setActionType(null);
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !product || !contextSupplierId) return;
    const contextSupplier = product.suppliers?.find((s) => s.id === contextSupplierId);
    if (!contextSupplier) return;
    setEditingSupplier(contextSupplier.id);
    setEditData({
      supplierPrice: contextSupplier.ProductSupplier.supplierPrice.toString(),
      quantity: contextSupplier.ProductSupplier.quantity.toString(),
      isAvailable: contextSupplier.ProductSupplier.isAvailable,
      notes: contextSupplier.ProductSupplier.notes || '',
    });
  }, [isOpen, product, contextSupplierId]);

  const loadAvailableSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?limit=1000');
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
    if (!product) return;
    const ok = await confirm({
      title: 'Удалить поставщика',
      message: 'Удалить поставщика из этого товара?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: 'Удалить поставщика',
      message: `Полностью удалить поставщика «${supplierName}» из базы данных? Это действие необратимо и удалит поставщика из всех товаров.`,
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;

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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Поставщики: ${product.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-3">
            <p className="text-label uppercase tracking-wider text-text-muted">Текущие поставщики</p>
            {sortedSuppliers.length > 0 ? (
              <div className="space-y-2">
                {sortedSuppliers.map((supplier) => (
                  <Card
                    key={supplier.id}
                    variant="elevated"
                    selected={supplier.id === contextSupplierId}
                  >
                    <CardBody compact>
                    {editingSupplier === supplier.id ? (
                      <div className="space-y-4">
                        <p className="text-body-medium text-brand-black">
                          {supplier.name}
                          {supplier.id === contextSupplierId && (
                            <span className="ml-2 text-caption text-brand-yellow-dark">
                              (текущий поставщик)
                            </span>
                          )}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            label="Цена у поставщика, ₸"
                            type="number"
                            min={0}
                            step="0.01"
                            value={editData.supplierPrice}
                            onChange={(e) =>
                              setEditData({ ...editData, supplierPrice: e.target.value })
                            }
                          />
                          <Input
                            label="Количество"
                            type="number"
                            min={0}
                            value={editData.quantity}
                            onChange={(e) =>
                              setEditData({ ...editData, quantity: e.target.value })
                            }
                          />
                          <Select
                            label="Доступен"
                            value={editData.isAvailable.toString()}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                isAvailable: e.target.value === 'true',
                              })
                            }
                          >
                            <option value="true">Да</option>
                            <option value="false">Нет</option>
                          </Select>
                        </div>
                        <Input
                          label="Заметки"
                          value={editData.notes}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          placeholder="Дополнительные заметки..."
                        />
                        <FormFooter
                          onCancel={() => setEditingSupplier(null)}
                          submitLabel="Сохранить"
                          submitLoading={loading}
                          submitDisabled={loading}
                          onSubmit={() => handleSaveEdit(supplier.id)}
                          submitType="button"
                          className="border-0 px-0 py-0"
                        />
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-body-medium text-brand-black mb-2">{supplier.name}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-caption text-text-muted">
                            <div>
                              <span className="text-label uppercase tracking-wider block mb-0.5">Цена</span>
                              {supplier.ProductSupplier.supplierPrice} ₸
                            </div>
                            <div>
                              <span className="text-label uppercase tracking-wider block mb-0.5">
                                Количество
                              </span>
                              {supplier.ProductSupplier.quantity}
                            </div>
                            <div>
                              <span className="text-label uppercase tracking-wider block mb-0.5">
                                Доступен
                              </span>
                              <span
                                className={
                                  supplier.ProductSupplier.isAvailable
                                    ? 'text-success'
                                    : 'text-danger'
                                }
                              >
                                {supplier.ProductSupplier.isAvailable ? 'Да' : 'Нет'}
                              </span>
                            </div>
                            <div>
                              <span className="text-label uppercase tracking-wider block mb-0.5">
                                Телефон
                              </span>
                              {supplier.phone}
                            </div>
                          </div>
                          {supplier.ProductSupplier.notes && (
                            <p className="mt-2 text-caption text-text-muted">
                              <span className="text-label uppercase tracking-wider mr-1">Заметки:</span>
                              {supplier.ProductSupplier.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <IconButton
                            icon={Edit}
                            title="Редактировать"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSupplier(supplier)}
                          />
                          <IconButton
                            icon={Trash2}
                            title="Удалить из товара"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSupplier(supplier.id)}
                            className="text-warning hover:bg-warning-light/50"
                          />
                          <IconButton
                            icon={Trash2}
                            title="Полностью удалить из базы данных"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteSupplierCompletely(supplier.id, supplier.name)
                            }
                            disabled={loading}
                            className="text-danger hover:bg-danger-light/50"
                          />
                        </div>
                      </div>
                    )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-caption text-text-muted italic">У этого товара пока нет поставщиков</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-label uppercase tracking-wider text-text-muted">
                Управление поставщиками
              </p>
              {!showAddForm && !showCreateForm && (
                <div className="flex flex-wrap gap-2">
                  {unlinkedSuppliers.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={Users}
                      onClick={() => {
                        setActionType('existing');
                        setShowAddForm(true);
                      }}
                      disabled={loading}
                    >
                      Выбрать существующего
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={UserPlus}
                    onClick={() => {
                      setActionType('create');
                      setShowCreateForm(true);
                    }}
                    disabled={loading}
                  >
                    Создать нового
                  </Button>
                </div>
              )}
            </div>

            {showAddForm && actionType === 'existing' && (
              <Card variant="inset">
                <CardBody>
                  <p className="text-label uppercase tracking-wider text-text-muted mb-4">
                    Выбрать существующего поставщика
                  </p>
                  <form onSubmit={handleAddSupplier} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Поставщик"
                        required
                        value={newSupplierData.supplierId}
                        onChange={(e) =>
                          setNewSupplierData({ ...newSupplierData, supplierId: e.target.value })
                        }
                      >
                        <option value="">Выберите поставщика</option>
                        {unlinkedSuppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} - {s.address}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Цена поставщика для этого товара"
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        value={newSupplierData.supplierPrice}
                        onChange={(e) =>
                          setNewSupplierData({
                            ...newSupplierData,
                            supplierPrice: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                      <Input
                        label="Количество на складе у поставщика"
                        type="number"
                        min={0}
                        value={newSupplierData.quantity}
                        onChange={(e) =>
                          setNewSupplierData({ ...newSupplierData, quantity: e.target.value })
                        }
                        placeholder="0"
                      />
                      <Select
                        label="Доступность"
                        value={newSupplierData.isAvailable.toString()}
                        onChange={(e) =>
                          setNewSupplierData({
                            ...newSupplierData,
                            isAvailable: e.target.value === 'true',
                          })
                        }
                      >
                        <option value="true">Доступен</option>
                        <option value="false">Недоступен</option>
                      </Select>
                    </div>
                    <Input
                      label="Заметки для этого товара"
                      value={newSupplierData.notes}
                      onChange={(e) =>
                        setNewSupplierData({ ...newSupplierData, notes: e.target.value })
                      }
                      placeholder="Особые условия поставки..."
                    />
                    <FormFooter
                      onCancel={() => {
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
                      submitLabel={loading ? 'Добавление...' : 'Добавить поставщика'}
                      submitLoading={loading}
                      submitDisabled={loading}
                      className="border-0 px-0 py-0"
                    />
                  </form>
                </CardBody>
              </Card>
            )}

            {!showAddForm && !showCreateForm && (
              <div className="space-y-2">
                {unlinkedSuppliers.length === 0 && (
                  <p className="text-caption text-text-muted italic">
                    Все доступные поставщики уже привязаны к этому товару
                  </p>
                )}
                <Alert variant="info" title="Управление поставщиками">
                  Выберите существующего поставщика или создайте нового. Удаление из товара убирает
                  связь только для этого товара; полное удаление — из всей базы.
                </Alert>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <SupplierFormModal
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
        mode="create"
        productId={product?.id}
        productName={product?.name}
      />
    </>
  );
};
