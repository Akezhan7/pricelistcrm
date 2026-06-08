import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Package } from 'lucide-react';
import ordersApi from '../services/ordersApi';
import suppliersApi from '../services/suppliersApi';
import api from '../utils/api';
import type { Supplier, CreateOrderDto, ProductVariation, ProductWithPrice } from '../types';
import {
  type OrderLineForm,
  buildMainOrderLine,
  getSupplierListPrice,
} from '../utils/orderItems';
import { useSupplierProducts } from '../hooks/useSupplierProducts';
import { SupplierProductCatalog } from './SupplierProductCatalog';
import { draftLinesToForm, useOrderDraft } from '../context/OrderDraftContext';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Alert } from './ui/Alert';
import { Spinner } from './ui/Spinner';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { OrderLineItemsEditor } from './forms/OrderLineItemsEditor';
import { formatPriceKZT } from '../utils/format';

export type { CreateOrderInitialItem } from '../utils/orderItems';

const SUPPLIERS_LIST_LIMIT = 1000;

const EMPTY_FORM = {
  supplierId: null as number | null,
  expectedDeliveryDate: '',
  deliveryLocation: 'Точка Байсад',
  notes: '',
  items: [] as OrderLineForm[],
};

const CreateOrderModal: React.FC = () => {
  const {
    draft,
    isModalOpen,
    closeModal,
    completeOrder,
    syncModalState,
  } = useOrderDraft();

  const orderType = draft?.type ?? 'purchase';
  const isReturn = orderType === 'return';

  const [supplierId, setSupplierId] = useState<number | null>(EMPTY_FORM.supplierId);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(EMPTY_FORM.expectedDeliveryDate);
  const [deliveryLocation, setDeliveryLocation] = useState(EMPTY_FORM.deliveryLocation);
  const [notes, setNotes] = useState(EMPTY_FORM.notes);
  const [items, setItems] = useState<OrderLineForm[]>(EMPTY_FORM.items);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const prevSupplierIdRef = useRef<number | null>(null);
  const isFormReadyRef = useRef(false);
  const hydrateSessionRef = useRef(false);

  const { products: supplierProducts, loading: loadingSupplierProducts, error: supplierProductsError } =
    useSupplierProducts(isModalOpen ? supplierId : null);

  const pickedProductIds = useMemo(
    () =>
      new Set(
        items.filter((i) => !i.productVariationId).map((i) => i.productId)
      ),
    [items]
  );

  const resetForm = () => {
    setSupplierId(EMPTY_FORM.supplierId);
    setExpectedDeliveryDate(EMPTY_FORM.expectedDeliveryDate);
    setDeliveryLocation(EMPTY_FORM.deliveryLocation);
    setNotes(EMPTY_FORM.notes);
    setItems(EMPTY_FORM.items);
    setProductSearch('');
    setError(null);
    prevSupplierIdRef.current = null;
    isFormReadyRef.current = false;
    hydrateSessionRef.current = false;
  };

  useEffect(() => {
    if (isModalOpen) {
      loadSuppliersList();
      return;
    }
    resetForm();
  }, [isModalOpen]);

  useLayoutEffect(() => {
    if (!isModalOpen) {
      hydrateSessionRef.current = false;
      return;
    }
    if (hydrateSessionRef.current) return;
    hydrateSessionRef.current = true;

    const sid = draft?.supplierId ? draft.supplierId : null;
    setSupplierId(sid);
    prevSupplierIdRef.current = sid;
    setItems(draftLinesToForm(draft));
    setDeliveryLocation(draft?.deliveryLocation ?? EMPTY_FORM.deliveryLocation);
    setExpectedDeliveryDate(draft?.expectedDeliveryDate ?? EMPTY_FORM.expectedDeliveryDate);
    setNotes(draft?.notes ?? EMPTY_FORM.notes);
    setProductSearch('');
    setError(null);
    isFormReadyRef.current = true;
  }, [isModalOpen, draft]);

  useEffect(() => {
    if (supplierProductsError) {
      setError(supplierProductsError);
    }
  }, [supplierProductsError]);

  useEffect(() => {
    if (!isModalOpen || !isFormReadyRef.current) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    syncModalState({
      supplierId,
      supplierName: supplier?.name ?? draft?.supplierName ?? '',
      type: orderType,
      lines: items,
      deliveryLocation,
      expectedDeliveryDate,
      notes,
    });
  }, [
    isModalOpen,
    supplierId,
    suppliers,
    items,
    deliveryLocation,
    expectedDeliveryDate,
    notes,
    orderType,
    draft?.supplierName,
    syncModalState,
  ]);

  const loadSuppliersList = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const suppliersData = await suppliersApi.getSuppliers({
        isActive: true,
        limit: SUPPLIERS_LIST_LIMIT,
      });
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
    } catch (err: unknown) {
      console.error('Ошибка загрузки данных:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      setSuppliers([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSupplierChange = (rawValue: string) => {
    const nextId = rawValue ? Number(rawValue) : null;

    if (
      prevSupplierIdRef.current !== null &&
      nextId !== null &&
      prevSupplierIdRef.current !== nextId
    ) {
      setItems([]);
    }
    if (!nextId) {
      setItems([]);
    }

    prevSupplierIdRef.current = nextId;
    setSupplierId(nextId);
    setProductSearch('');
  };

  const handleAddProduct = async (product: ProductWithPrice) => {
    if (pickedProductIds.has(product.id)) {
      return;
    }

    let variations: ProductVariation[] = [];
    try {
      const response = await api.get(`/products/${product.id}/variations`);
      variations = response.data.data.variations || [];
    } catch (err) {
      console.error('Ошибка загрузки вариаций:', err);
    }

    const mainItem = buildMainOrderLine(
      { ...product, variations },
      { quantity: 1, priceAtPurchase: getSupplierListPrice(product) }
    );

    setItems((prev) => [...prev, mainItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity };
      return next;
    });
  };

  const handleUpdatePrice = (index: number, price: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], priceAtPurchase: price };
      return next;
    });
  };

  const handleUpdateNotes = (index: number, note: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes: note };
      return next;
    });
  };

  const handleAddVariationAsNewItem = (productIndex: number, variationId: number) => {
    const sourceItem = items[productIndex];
    const variation = sourceItem.product?.variations?.find((v) => v.id === variationId);

    if (!variation) return;

    const newItem: OrderLineForm = {
      productId: sourceItem.productId,
      product: sourceItem.product,
      productVariationId: variationId,
      selectedVariation: variation,
      quantity: 1,
      priceAtPurchase: Number(variation.price) || 0,
      notes: '',
      uniqueKey: `product-${sourceItem.productId}-var-${variationId}-${Date.now()}`,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const calculateTotal = () =>
    items.reduce((sum, item) => sum + item.quantity * item.priceAtPurchase, 0);

  const validateForm = (): string | null => {
    if (!supplierId) return 'Выберите поставщика';
    if (items.length === 0) return 'Добавьте хотя бы один товар';

    for (const item of items) {
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

      const orderData: CreateOrderDto = {
        supplierId: supplierId!,
        type: orderType,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryLocation: deliveryLocation || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          productVariationId: item.productVariationId || undefined,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          notes: item.notes || undefined,
        })),
      };

      await ordersApi.createOrder(orderData);
      completeOrder();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isReturn
            ? 'Ошибка создания возврата'
            : 'Ошибка создания заявки'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeModal();
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={handleClose}
      title={isReturn ? 'Оформить возврат' : 'Создать новую заявку'}
      size="xl"
      footer={
        !loadingData ? (
          <FormFooter
            onCancel={handleClose}
            submitLabel={
              loading
                ? isReturn
                  ? 'Оформление...'
                  : 'Создание...'
                : isReturn
                  ? 'Оформить возврат'
                  : 'Создать заявку'
            }
            submitLoading={loading}
            submitDisabled={loading || loadingData}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
            submitVariant={isReturn ? 'primary' : 'accent'}
          />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Поставщик"
              required
              value={supplierId || ''}
              onChange={(e) => handleSupplierChange(e.target.value)}
            >
              <option value="">Выберите поставщика</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} - {supplier.phone}
                </option>
              ))}
            </Select>

            <Input
              label="Ожидаемая дата поставки"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />

            <div className="md:col-span-2">
              <Input
                label="Место доставки"
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Точка Байсад"
              />
            </div>
          </div>

              <div>
                <p className="text-overline text-text-muted tracking-wider mb-3">
                  Товары поставщика <span className="text-danger">*</span>
                </p>

                {!supplierId ? (
                  <div className="text-center py-8 text-text-muted border-2 border-dashed border-border-subtle rounded-xl bg-surface-inset">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Сначала выберите поставщика</p>
                    <p className="text-sm mt-1">Здесь появятся его товары</p>
                  </div>
                ) : (
                  <SupplierProductCatalog
                    products={supplierProducts}
                    loading={loadingSupplierProducts}
                    search={productSearch}
                    onSearchChange={setProductSearch}
                    mode="pick"
                    listMaxHeight="max-h-56"
                    onPickProduct={handleAddProduct}
                    pickedProductIds={pickedProductIds}
                  />
                )}

                <div className="mt-4">
                  <p className="text-overline text-text-muted tracking-wider mb-3">
                    Добавлено в {isReturn ? 'возврат' : 'заявку'}
                  </p>

                  <OrderLineItemsEditor
                    items={items}
                    mode="create"
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdatePrice={handleUpdatePrice}
                    onUpdateNotes={handleUpdateNotes}
                    onRemoveItem={handleRemoveItem}
                    onAddVariation={handleAddVariationAsNewItem}
                    isVariationTaken={(productId, variationId) =>
                      items.some(
                        (item) =>
                          item.productId === productId && item.productVariationId === variationId
                      )
                    }
                  />
                </div>
              </div>

          <Textarea
            label="Комментарии"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Дополнительная информация о заявке..."
            className="resize-none"
          />

          {items.length > 0 && (
            <div className="bg-surface-inset border border-border-subtle rounded-xl p-4">
              <div className="flex justify-between items-center gap-4">
                <span className="text-body-medium text-brand-black">
                  Общая сумма {isReturn ? 'возврата' : 'заявки'}:
                </span>
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

export default CreateOrderModal;
