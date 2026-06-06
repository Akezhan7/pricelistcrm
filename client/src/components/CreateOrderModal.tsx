import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Loader2, AlertCircle, Package, PlusCircle, Undo2 } from 'lucide-react';
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

    const alreadyExists = items.some(
      (item) => item.productId === sourceItem.productId && item.productVariationId === variationId
    );

    if (alreadyExists) {
      alert('Эта вариация уже добавлена в заявку');
      return;
    }

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

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isReturn && <Undo2 className="w-6 h-6 text-yellow-600" />}
            {isReturn ? 'Оформить возврат' : 'Создать новую заявку'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingData ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Поставщик <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={supplierId || ''}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Выберите поставщика</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} - {supplier.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ожидаемая дата поставки
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Место доставки
                  </label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="Точка Байсад"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Товары поставщика <span className="text-red-500">*</span>
                </label>

                {!supplierId ? (
                  <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Добавлено в {isReturn ? 'возврат' : 'заявку'}
                  </label>

                  {items.length > 0 ? (
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={item.uniqueKey || index}
                          className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Товар
                                </label>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.product?.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {item.product?.article}
                                    </div>
                                  </div>
                                  {item.product?.variations && item.product.variations.length > 0 && (
                                    <div className="relative group">
                                      <button
                                        type="button"
                                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                                        onClick={() => {
                                          const dropdown = document.getElementById(
                                            `variations-dropdown-${index}`
                                          );
                                          dropdown?.classList.toggle('hidden');
                                        }}
                                      >
                                        <PlusCircle className="w-3 h-3" />
                                        Добавить вариацию
                                      </button>
                                      <div
                                        id={`variations-dropdown-${index}`}
                                        className="hidden absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                                      >
                                        {item.product.variations
                                          .filter((v) => v.isActive)
                                          .map((variation) => (
                                            <button
                                              key={variation.id}
                                              type="button"
                                              onClick={() => {
                                                handleAddVariationAsNewItem(index, variation.id);
                                                document
                                                  .getElementById(`variations-dropdown-${index}`)
                                                  ?.classList.add('hidden');
                                              }}
                                              className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                            >
                                              <div className="text-sm font-medium text-gray-900">
                                                {variation.name}: {variation.value}
                                              </div>
                                              <div className="text-xs text-gray-600">
                                                {Number(variation.price).toLocaleString('ru-RU')} ₸
                                                {variation.sku && (
                                                  <span className="text-gray-400 ml-1">
                                                    ({variation.sku})
                                                  </span>
                                                )}
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {item.selectedVariation && (
                                <div className="md:col-span-4 bg-blue-50 p-2 rounded-lg">
                                  <div className="text-xs font-medium text-blue-900">
                                    Вариация: {item.selectedVariation.name} -{' '}
                                    {item.selectedVariation.value}
                                    {item.selectedVariation.sku && (
                                      <span className="text-blue-700 ml-1">
                                        ({item.selectedVariation.sku})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Количество
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(index, Number(e.target.value))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Цена (₸)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.priceAtPurchase}
                                  onChange={(e) =>
                                    handleUpdatePrice(index, Number(e.target.value))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Заметки
                                </label>
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateNotes(index, e.target.value)}
                                  placeholder="Дополнительная информация..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>

                              <div className="md:col-span-4">
                                <div className="text-right text-sm font-medium text-gray-900">
                                  Итого:{' '}
                                  {(item.quantity * item.priceAtPurchase).toLocaleString('ru-RU')}{' '}
                                  ₸
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 transition-colors p-2"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 border border-dashed border-gray-200 rounded-lg text-sm">
                      <p>Нажмите «+» у товара в списке выше</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарии
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Дополнительная информация о заявке..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {items.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                      Общая сумма {isReturn ? 'возврата' : 'заявки'}:
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculateTotal().toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || loadingData}
            className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              isReturn ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isReturn ? 'Оформление...' : 'Создание...'}
              </>
            ) : isReturn ? (
              <>
                <Undo2 className="w-5 h-5" />
                Оформить возврат
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Создать заявку
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;
