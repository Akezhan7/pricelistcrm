import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Loader2, AlertCircle, Package, PlusCircle, Save } from 'lucide-react';
import ordersApi from '../services/ordersApi';
import productsApi from '../services/productsApi';
import api from '../utils/api';
import type { Order, Product, UpdateOrderDto, ProductVariation, OrderItem } from '../types';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: Order;
}

interface OrderItemForm {
  id?: number; // Если есть ID - существующий товар, если нет - новый
  productId: number;
  product?: Product;
  productVariationId?: number | null;
  selectedVariation?: ProductVariation | null;
  quantity: number;
  priceAtPurchase: number;
  notes?: string;
  uniqueKey?: string;
  isDeleted?: boolean; // Для мягкого удаления
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, onSuccess, order }) => {
  // Состояния формы
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>([]);

  // Списки для выбора
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Поиск товара
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Состояния UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Загрузка данных при открытии
  useEffect(() => {
    if (isOpen && order) {
      loadInitialData();
    }
  }, [isOpen, order]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Загрузить список товаров
      const productsData = await productsApi.getProducts({ isActive: true });
      const productsArray = Array.isArray(productsData) ? productsData : [];
      setProducts(productsArray);
      setFilteredProducts(productsArray);

      // Инициализировать форму данными заявки
      setExpectedDeliveryDate(order.expectedDeliveryDate || '');
      setDeliveryLocation(order.deliveryLocation || 'Точка Байсад');
      setNotes(order.notes || '');

      // Преобразовать существующие товары в формат для редактирования
      const formItems: OrderItemForm[] = await Promise.all(
        (order.items || []).map(async (item: OrderItem) => {
          // Загрузить вариации для каждого товара
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
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Фильтрация товаров при поиске
  useEffect(() => {
    if (productSearch.trim()) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.article.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  // Добавление товара в список
  const handleAddProduct = async (product: Product) => {
    // Загрузить вариации товара
    let variations: ProductVariation[] = [];
    try {
      const response = await api.get(`/products/${product.id}/variations`);
      variations = response.data.data.variations || [];
    } catch (error) {
      console.error('Ошибка загрузки вариаций:', error);
    }

    const newItem: OrderItemForm = {
      productId: product.id,
      product: { ...product, variations },
      productVariationId: null,
      selectedVariation: null,
      quantity: 1,
      priceAtPurchase: Number(product.costPrice) || 0,
      notes: '',
      uniqueKey: `new-${product.id}-${Date.now()}`,
      isDeleted: false
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  // Удаление товара из списка
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    const item = newItems[index];

    if (item.id) {
      // Существующий товар - пометить как удаленный
      item.isDeleted = true;
    } else {
      // Новый товар - просто удалить из массива
      newItems.splice(index, 1);
    }

    setItems(newItems);
  };

  // Восстановить удаленный товар
  const handleRestoreItem = (index: number) => {
    const newItems = [...items];
    newItems[index].isDeleted = false;
    setItems(newItems);
  };

  // Обновление количества товара
  const handleUpdateQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  // Обновление цены товара
  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].priceAtPurchase = price;
    setItems(newItems);
  };

  // Обновление заметок товара
  const handleUpdateNotes = (index: number, notes: string) => {
    const newItems = [...items];
    newItems[index].notes = notes;
    setItems(newItems);
  };

  // Добавить вариацию как отдельную позицию
  const handleAddVariationAsNewItem = (productIndex: number, variationId: number) => {
    const sourceItem = items[productIndex];
    const variation = sourceItem.product?.variations?.find(v => v.id === variationId);
    
    if (!variation) return;

    // Проверить, не добавлена ли уже эта вариация
    const alreadyExists = items.some(
      item => !item.isDeleted && item.productId === sourceItem.productId && item.productVariationId === variationId
    );

    if (alreadyExists) {
      alert('Эта вариация уже добавлена в заявку');
      return;
    }

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

  // Расчет общей суммы (только активные товары)
  const calculateTotal = () => {
    return items
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.quantity * item.priceAtPurchase), 0);
  };

  // Валидация формы
  const validateForm = (): string | null => {
    const activeItems = items.filter(item => !item.isDeleted);
    
    if (activeItems.length === 0) {
      return 'Добавьте хотя бы один товар в заявку';
    }
    
    for (const item of activeItems) {
      if (item.quantity <= 0) return 'Количество товара должно быть больше 0';
      if (item.priceAtPurchase < 0) return 'Цена товара не может быть отрицательной';
    }
    
    return null;
  };

  // Отправка формы
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

      // Подготовить данные для отправки (только активные товары)
      const activeItems = items.filter(item => !item.isDeleted);

      const orderData: UpdateOrderDto = {
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryLocation: deliveryLocation || undefined,
        notes: notes || undefined,
        items: activeItems.map(item => ({
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

  // Закрытие модального окна
  const handleClose = () => {
    setExpectedDeliveryDate('');
    setDeliveryLocation('');
    setNotes('');
    setItems([]);
    setProductSearch('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const activeItemsCount = items.filter(item => !item.isDeleted).length;
  const deletedItemsCount = items.filter(item => item.isDeleted).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Редактирование заявки</h2>
            <p className="text-sm text-gray-600 mt-1">
              {order.orderNumber} • {order.supplier?.name}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Контент с прокруткой */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingData ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ошибка */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Предупреждение о статусе */}
              {order.status !== 'В работе' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Внимание:</strong> Эта заявка имеет статус "{order.status}". 
                    Редактирование может быть ограничено системными правилами.
                  </p>
                </div>
              )}

              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Дата поставки */}
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

                {/* Место доставки */}
                <div>
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

              {/* Товары */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Товары в заявке
                  </label>
                  <div className="text-sm text-gray-600">
                    Активных: <span className="font-semibold text-green-600">{activeItemsCount}</span>
                    {deletedItemsCount > 0 && (
                      <span className="ml-3">
                        Удалено: <span className="font-semibold text-red-600">{deletedItemsCount}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Поиск товара для добавления */}
                <div className="relative mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Добавить товар: поиск по названию или артикулу..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Выпадающий список товаров */}
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.slice(0, 10).map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.article} • {Number(product.costPrice).toLocaleString('ru-RU')} ₸
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Список товаров */}
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.uniqueKey || index}
                        className={`p-4 rounded-lg border transition-all ${
                          item.isDeleted
                            ? 'bg-red-50 border-red-200 opacity-60'
                            : item.id
                            ? 'bg-white border-gray-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        {item.isDeleted ? (
                          // Удаленный товар
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-700">
                                🗑️ Удалено: {item.product?.name}
                                {item.selectedVariation && ` (${item.selectedVariation.name}: ${item.selectedVariation.value})`}
                              </div>
                              <div className="text-xs text-red-600">
                                Будет удалено из заявки при сохранении
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreItem(index)}
                              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              Восстановить
                            </button>
                          </div>
                        ) : (
                          // Активный товар
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              {/* Название товара */}
                              <div className="md:col-span-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {!item.id && (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                        НОВЫЙ
                                      </span>
                                    )}
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {item.product?.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {item.product?.article}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Кнопка добавления вариаций */}
                                  {item.product?.variations && item.product.variations.length > 0 && (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                                        onClick={() => {
                                          const dropdown = document.getElementById(`edit-variations-dropdown-${index}`);
                                          if (dropdown) dropdown.classList.toggle('hidden');
                                        }}
                                      >
                                        <PlusCircle className="w-3 h-3" />
                                        Добавить вариацию
                                      </button>
                                      <div
                                        id={`edit-variations-dropdown-${index}`}
                                        className="hidden absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                                      >
                                        {item.product.variations.filter(v => v.isActive).map(variation => (
                                          <button
                                            key={variation.id}
                                            type="button"
                                            onClick={() => {
                                              handleAddVariationAsNewItem(index, variation.id);
                                              document.getElementById(`edit-variations-dropdown-${index}`)?.classList.add('hidden');
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                          >
                                            <div className="text-sm font-medium text-gray-900">
                                              {variation.name}: {variation.value}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              {Number(variation.price).toLocaleString('ru-RU')} ₸
                                              {variation.sku && <span className="text-gray-400 ml-1">({variation.sku})</span>}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Вариация (если выбрана) */}
                              {item.selectedVariation && (
                                <div className="md:col-span-4 bg-blue-50 p-2 rounded-lg">
                                  <div className="text-xs font-medium text-blue-900">
                                    🔹 Вариация: {item.selectedVariation.name} - {item.selectedVariation.value}
                                    {item.selectedVariation.sku && <span className="text-blue-700 ml-1">({item.selectedVariation.sku})</span>}
                                  </div>
                                </div>
                              )}

                              {/* Количество */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Количество
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(index, Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Цена */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Цена (₸)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.priceAtPurchase}
                                  onChange={(e) => handleUpdatePrice(index, Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Заметки */}
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Заметки
                                </label>
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateNotes(index, e.target.value)}
                                  placeholder="Дополнительная информация..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Итого */}
                              <div className="md:col-span-4">
                                <div className="text-right text-sm font-medium text-gray-900">
                                  Итого: {(item.quantity * item.priceAtPurchase).toLocaleString('ru-RU')} ₸
                                </div>
                              </div>
                            </div>

                            {/* Кнопка удаления */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 transition-colors p-2"
                              title="Удалить товар"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Нет товаров в заявке</p>
                  </div>
                )}
              </div>

              {/* Комментарии */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарии к заявке
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Дополнительная информация о заявке..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Итоговая сумма */}
              {activeItemsCount > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-blue-800">Новая общая сумма заявки:</span>
                      {order.totalAmount && (
                        <div className="text-xs text-blue-600 mt-1">
                          Было: {Number(order.totalAmount).toLocaleString('ru-RU')} ₸
                        </div>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculateTotal().toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {activeItemsCount > 0 ? (
              <span>✓ Готово к сохранению</span>
            ) : (
              <span className="text-red-600">⚠️ Добавьте товары</span>
            )}
          </div>
          <div className="flex gap-3">
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
              disabled={loading || loadingData || activeItemsCount === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
