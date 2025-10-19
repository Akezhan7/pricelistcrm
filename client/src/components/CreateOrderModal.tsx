import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Loader2, AlertCircle, Package } from 'lucide-react';
import ordersApi from '../services/ordersApi';
import suppliersApi from '../services/suppliersApi';
import productsApi from '../services/productsApi';
import type { Supplier, Product, CreateOrderDto } from '../types';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItemForm {
  productId: number;
  product?: Product;
  quantity: number;
  priceAtPurchase: number;
  notes?: string;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Состояния формы
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('Точка Байсад');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemForm[]>([]);

  // Списки для выбора
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Поиск товара
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Состояния UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Загрузка поставщиков и товаров при открытии
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const [suppliersData, productsData] = await Promise.all([
        suppliersApi.getSuppliers({ isActive: true }),
        productsApi.getProducts({ isActive: true })
      ]);
      
      // Проверяем, что данные являются массивами
      const suppliersArray = Array.isArray(suppliersData) ? suppliersData : [];
      const productsArray = Array.isArray(productsData) ? productsData : [];
      
      setSuppliers(suppliersArray);
      setProducts(productsArray);
      setFilteredProducts(productsArray);
    } catch (err: any) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
      setSuppliers([]);
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
  const handleAddProduct = (product: Product) => {
    // Проверка, не добавлен ли уже этот товар
    if (items.some(item => item.productId === product.id)) {
      alert('Этот товар уже добавлен в заявку');
      return;
    }

    const newItem: OrderItemForm = {
      productId: product.id,
      product,
      quantity: 1,
      priceAtPurchase: Number(product.costPrice) || 0,
      notes: ''
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  // Удаление товара из списка
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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

  // Расчет общей суммы
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.priceAtPurchase), 0);
  };

  // Валидация формы
  const validateForm = (): string | null => {
    if (!supplierId) return 'Выберите поставщика';
    if (items.length === 0) return 'Добавьте хотя бы один товар';
    
    for (const item of items) {
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

      const orderData: CreateOrderDto = {
        supplierId: supplierId!,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryLocation: deliveryLocation || undefined,
        notes: notes || undefined,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          notes: item.notes || undefined
        }))
      };

      await ordersApi.createOrder(orderData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания заявки');
    } finally {
      setLoading(false);
    }
  };

  // Закрытие модального окна
  const handleClose = () => {
    setSupplierId(null);
    setExpectedDeliveryDate('');
    setDeliveryLocation('Точка Байсад');
    setNotes('');
    setItems([]);
    setProductSearch('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Создать новую заявку</h2>
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

              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Поставщик */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Поставщик <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={supplierId || ''}
                    onChange={(e) => setSupplierId(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Выберите поставщика</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} - {supplier.phone}
                      </option>
                    ))}
                  </select>
                </div>

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

              {/* Товары */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Товары <span className="text-red-500">*</span>
                </label>

                {/* Поиск товара */}
                <div className="relative mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Поиск товара по названию или артикулу..."
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

                {/* Список добавленных товаров */}
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Название товара */}
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Товар
                              </label>
                              <div className="text-sm font-medium text-gray-900">
                                {item.product?.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.product?.article}
                              </div>
                            </div>

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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>

                            {/* Заметки */}
                            <div className="md:col-span-4">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Заметки
                              </label>
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => handleUpdateNotes(index, e.target.value)}
                                placeholder="Размер, цвет, и т.д."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Товары не добавлены</p>
                    <p className="text-sm">Используйте поиск выше для добавления товаров</p>
                  </div>
                )}
              </div>

              {/* Комментарии */}
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

              {/* Итоговая сумма */}
              {items.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Общая сумма заявки:</span>
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
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Создание...
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
