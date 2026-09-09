import React, { useState, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
import ordersApi from '../services/ordersApi';
import suppliersApi from '../services/suppliersApi';
import api from '../utils/api';
import type { Order, Product, Supplier, UpdateOrderDto, ProductVariation, OrderItem, OrderSettlementType } from '../types';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { Spinner } from './ui/Spinner';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { OrderLineItemsEditor, type OrderLineItemEdit } from './forms/OrderLineItemsEditor';
import { formatPriceKZT } from '../utils/format';
import { useProductCatalogSearch } from '../hooks/useProductCatalogSearch';
import { getSupplierListPrice } from '../utils/orderItems';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order;
}

type OrderItemForm = OrderLineItemEdit;

const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, onSuccess, order }) => {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [settlementType, setSettlementType] = useState<OrderSettlementType>('standard');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const {
    products: filteredProducts,
    loading: productsLoading,
    loadingMore: productsLoadingMore,
    error: productsError,
    hasMore: hasMoreProducts,
    loadMore: loadMoreProducts,
  } = useProductCatalogSearch({ enabled: isOpen, search: productSearch });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const isCorrection = order.editPolicy?.mode === 'correction';
  const supplierChanged = supplierId !== (order.supplierId || null);
  const requiresSupplierChangeReason = supplierChanged
    && Boolean(order.editPolicy?.supplierChangeRequiresReason);

  useEffect(() => {
    if (isOpen && order) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      const suppliersData = await suppliersApi.getSuppliers({ isActive: true, limit: 1000 });
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);

      // Инициализировать форму данными заявки
      setExpectedDeliveryDate(order.expectedDeliveryDate || '');
      setSupplierId(order.supplierId || null);
      setSettlementType(order.settlementType || 'standard');
      setDeliveryLocation(order.deliveryLocation || 'Точка Байсад');
      setNotes(order.notes || '');

      const formItems: OrderItemForm[] = await Promise.all(
        (order.items || []).map(async (item: OrderItem) => {
          let variations: ProductVariation[] = [];
          try {
            const response = await api.get(`/products/${item.productId}/variations`);
            variations = response.data.data.variations || [];
          } catch (error) {
            console.error('Ошибка загрузки вариаций:', error);
          }

          return {
            id: item.id,
            productId: item.productId,
            product: item.product ? {
              id: item.product.id,
              name: item.product.name,
              article: item.product.article,
              image: item.product.image,
              costPrice: Number(item.product.costPrice) || 0,
              sellingPrice: Number(item.product.sellingPrice) || 0,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              variations
            } : undefined,
            productVariationId: item.productVariationId || null,
            selectedVariation: item.variation ? {
              id: item.variation.id,
              productId: item.productId,
              name: item.variation.name,
              value: item.variation.value,
              price: Number(item.variation.price),
              sku: item.variation.sku,
              isActive: true,
              sortOrder: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } : null,
            quantity: item.quantity,
            priceAtPurchase: Number(item.priceAtPurchase),
            notes: item.notes || '',
            uniqueKey: `existing-${item.id}`,
            isDeleted: false
          };
        })
      );

      setItems(formItems);
    } catch (err: any) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddProduct = async (product: Product) => {
    let variations: ProductVariation[] = [];
    try {
      const response = await api.get(`/products/${product.id}/variations`);
      variations = response.data.data.variations || [];
    } catch (error) {
      console.error('Ошибка загрузки вариаций:', error);
    }

    const selectedSupplier = supplierId
      ? product.suppliers?.find((supplier) => supplier.id === supplierId)
      : undefined;
    const productWithSupplierPrice = selectedSupplier
      ? { ...product, ProductSupplier: selectedSupplier.ProductSupplier }
      : product;
    const newItem: OrderItemForm = {
      productId: product.id,
      product: { ...product, variations },
      productVariationId: null,
      selectedVariation: null,
      quantity: 1,
      priceAtPurchase: getSupplierListPrice(productWithSupplierPrice),
      notes: '',
      uniqueKey: `new-${product.id}-${Date.now()}`,
      isDeleted: false
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    const item = newItems[index];

    if (item.id) {
      item.isDeleted = true;
    } else {
      newItems.splice(index, 1);
    }

    setItems(newItems);
  };

  const handleRestoreItem = (index: number) => {
    const newItems = [...items];
    newItems[index].isDeleted = false;
    setItems(newItems);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].priceAtPurchase = price;
    setItems(newItems);
  };

  const handleUpdateNotes = (index: number, notes: string) => {
    const newItems = [...items];
    newItems[index].notes = notes;
    setItems(newItems);
  };

  const handleAddVariationAsNewItem = (productIndex: number, variationId: number) => {
    const sourceItem = items[productIndex];
    const variation = sourceItem.product?.variations?.find(v => v.id === variationId);
    
    if (!variation) return;

    const newItem: OrderItemForm = {
      productId: sourceItem.productId,
      product: sourceItem.product,
      productVariationId: variationId,
      selectedVariation: variation,
      quantity: 1,
      priceAtPurchase: Number(variation.price) || 0,
      notes: '',
      uniqueKey: `new-var-${sourceItem.productId}-${variationId}-${Date.now()}`,
      isDeleted: false
    };

    setItems([...items, newItem]);
  };

  const calculateTotal = () => {
    return items
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.quantity * item.priceAtPurchase), 0);
  };

  const validateForm = (): string | null => {
    const activeItems = items.filter(item => !item.isDeleted);
    
    if (activeItems.length === 0) {
      return isCorrection
        ? 'Для полного возврата используйте возвратную накладную'
        : 'Добавьте хотя бы один товар в заявку';
    }

    if ((isCorrection || requiresSupplierChangeReason) && correctionReason.trim().length < 5) {
      return isCorrection
        ? 'Укажите причину корректировки (минимум 5 символов)'
        : 'Укажите причину смены поставщика (минимум 5 символов)';
    }
    
    for (const item of activeItems) {
      if (item.quantity <= 0) return 'Количество товара должно быть больше 0';
      if (item.priceAtPurchase < 0) return 'Цена товара не может быть отрицательной';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const activeItems = items.filter(item => !item.isDeleted);

      const orderData: UpdateOrderDto = {
        supplierId,
        settlementType: order.type === 'return' ? 'standard' : settlementType,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryLocation: deliveryLocation || undefined,
        notes: notes || undefined,
        correctionReason: isCorrection || requiresSupplierChangeReason
          ? correctionReason.trim()
          : undefined,
        items: activeItems.map(item => ({
          id: item.id,
          productId: item.productId,
          productVariationId: item.productVariationId || undefined,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          notes: item.notes || undefined
        }))
      };

      await ordersApi.updateOrder(order.id, orderData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления заявки');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSupplierId(null);
    setSettlementType('standard');
    setSuppliers([]);
    setExpectedDeliveryDate('');
    setDeliveryLocation('');
    setNotes('');
    setCorrectionReason('');
    setItems([]);
    setProductSearch('');
    setError(null);
    onClose();
  };

  const activeItemsCount = items.filter((item) => !item.isDeleted).length;
  const deletedItemsCount = items.filter((item) => item.isDeleted).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${isCorrection ? 'Корректировка' : 'Редактирование'} заявки — ${order.orderNumber}`}
      size="xl"
      footer={
        !loadingData ? (
          <FormFooter
            onCancel={handleClose}
            submitLabel={loading ? 'Сохранение...' : isCorrection ? 'Сохранить корректировку' : 'Сохранить изменения'}
            submitLoading={loading}
            submitDisabled={loading || loadingData || activeItemsCount === 0}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
          >
            <span className="text-sm text-text-muted">
              {activeItemsCount > 0 ? (
                <span>✓ Готово к сохранению</span>
              ) : (
                <span className="text-danger">⚠️ Добавьте товары</span>
              )}
            </span>
          </FormFooter>
        ) : undefined
      }
    >
      {loadingData ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <Alert variant="error">{error}</Alert>}

          {isCorrection && (
            <Alert variant="warning" title="Внимание">
              Заявка уже принята. Количество изменит остаток только на разницу, платежи и
              исходная приёмка сохранятся. Фактический возврат оформляйте возвратной накладной.
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Поставщик"
              value={supplierId || ''}
              onChange={(event) => setSupplierId(event.target.value ? Number(event.target.value) : null)}
              disabled={order.editPolicy ? !order.editPolicy.canChangeSupplier : order.status !== 'Создана'}
            >
              {(order.status === 'Создана' || !order.supplierId) && (
                <option value="">Без поставщика</option>
              )}
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} - {supplier.phone}
                </option>
              ))}
            </Select>
            {order.type !== 'return' && (
              <Select
                label="Условие расчёта"
                value={settlementType}
                onChange={(event) => setSettlementType(event.target.value as OrderSettlementType)}
              >
                <option value="standard">Обычная закупка</option>
                <option value="consignment">Под реализацию</option>
              </Select>
            )}
            <Input
              label="Ожидаемая дата поставки"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
            <Input
              label="Место доставки"
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              placeholder="Точка Байсад"
            />
          </div>

              {/* Товары */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-overline text-text-muted tracking-wider">Товары в заявке</p>
                  <div className="text-caption text-text-muted">
                    Активных: <span className="font-semibold text-success">{activeItemsCount}</span>
                    {deletedItemsCount > 0 && (
                      <span className="ml-3">
                        Удалено: <span className="font-semibold text-danger">{deletedItemsCount}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Добавить товар: поиск по названию или артикулу..."
                      className="w-full pl-10 pr-4 py-2.5 bg-brand-white border border-border-input rounded-lg shadow-sm hover:border-text-muted/60 focus:ring-2 focus:ring-brand-yellow/20 focus:border-brand-yellow text-body transition-colors"
                    />
                  </div>

                  {showProductDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-surface-overlay border border-border-subtle rounded-xl shadow-md max-h-60 overflow-y-auto">
                      {productsLoading ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-5 text-text-muted">
                          <Spinner size="sm" />
                          <span>Поиск товаров...</span>
                        </div>
                      ) : productsError ? (
                        <div className="px-4 py-4 text-sm text-danger">{productsError}</div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-text-muted">Товары не найдены</div>
                      ) : filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full px-4 py-3 text-left hover:bg-surface-inset/60 transition-colors border-b border-border-subtle last:border-0"
                        >
                          <div className="font-medium text-brand-black">{product.name}</div>
                          <div className="text-sm text-text-muted">
                            {product.article} • {Number(product.costPrice).toLocaleString('ru-RU')} ₸
                          </div>
                        </button>
                      ))}
                      {!productsLoading && !productsError && hasMoreProducts && (
                        <button
                          type="button"
                          disabled={productsLoadingMore}
                          onClick={loadMoreProducts}
                          className="w-full px-4 py-3 text-center text-sm font-medium text-brand-black hover:bg-surface-inset/60 disabled:opacity-60"
                        >
                          {productsLoadingMore ? 'Загрузка...' : 'Показать ещё'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {items.length > 0 ? (
                  <OrderLineItemsEditor
                    items={items}
                    mode="edit"
                    emptyMessage="Нет товаров в заявке"
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdatePrice={handleUpdatePrice}
                    onUpdateNotes={handleUpdateNotes}
                    onRemoveItem={handleRemoveItem}
                    onAddVariation={handleAddVariationAsNewItem}
                    onRestoreItem={handleRestoreItem}
                    isVariationTaken={(productId, variationId) =>
                      items.some(
                        (item) =>
                          !item.isDeleted &&
                          item.productId === productId &&
                          item.productVariationId === variationId
                      )
                    }
                  />
                ) : (
                  <div className="text-center py-8 text-text-muted border-2 border-dashed border-border-subtle rounded-xl bg-surface-inset">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Нет товаров в заявке</p>
                  </div>
                )}
              </div>

          <Textarea
            label="Комментарии к заявке"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Дополнительная информация о заявке..."
            className="resize-none"
          />

          {requiresSupplierChangeReason && (
            <Alert variant="warning" title="Поставщик будет изменён">
              Заявка вернётся в статус «Создана». Проверьте закупочные цены и отправьте её новому поставщику повторно.
            </Alert>
          )}

          {(isCorrection || requiresSupplierChangeReason) && (
            <Textarea
              label={isCorrection ? 'Причина корректировки' : 'Причина смены поставщика'}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              rows={3}
              placeholder={isCorrection
                ? 'Например, поставщик уточнил фактическую цену после поставки'
                : 'Например, первый поставщик не подтвердил наличие'}
              required
              className="resize-none"
            />
          )}

          {activeItemsCount > 0 && (
            <div className="bg-surface-inset border border-border-subtle rounded-xl p-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-body-medium text-brand-black">Новая общая сумма заявки:</span>
                  {order.totalAmount && (
                    <div className="text-caption text-text-muted mt-1">
                      Было: {formatPriceKZT(order.totalAmount)}
                    </div>
                  )}
                  {isCorrection && (
                    <div className="text-caption text-text-muted mt-1">
                      Будет сохранена история значений до и после изменения
                    </div>
                  )}
                </div>
                <span className="text-metric font-tabular text-brand-black">
                  {formatPriceKZT(calculateTotal())}
                </span>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
};

export default EditOrderModal;
