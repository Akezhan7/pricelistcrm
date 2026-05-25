import React, { useMemo, useState } from 'react';
import { Plus, Undo2, Search, Image as ImageIcon, Check } from 'lucide-react';
import { Supplier, ProductWithPrice } from '../types';
import getImageUrl from '../utils/image';
import CreateOrderModal, { CreateOrderInitialItem } from './CreateOrderModal';

interface SupplierProductsPanelProps {
  supplier: Supplier;
  onOrderSuccess?: () => void;
  /** Если разрешено создавать заявки/возвраты. */
  canCreate?: boolean;
}

export const SupplierProductsPanel: React.FC<SupplierProductsPanelProps> = ({
  supplier,
  onOrderSuccess,
  canCreate = true,
}) => {
  const products = useMemo<ProductWithPrice[]>(
    () => (supplier.products || []) as ProductWithPrice[],
    [supplier.products]
  );

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // quantities[productId] = N
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState<'purchase' | 'return'>('purchase');

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat('ru-RU').format(Number(price) || 0);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.article.toLowerCase().includes(q)
    );
  }, [products, search]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setQuantities((prev) => ({ ...prev, [id]: prev[id] || 1 }));
  };

  const setQuantity = (id: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, qty || 1) }));
  };

  const selectedItems: CreateOrderInitialItem[] = useMemo(
    () =>
      Array.from(selectedIds).map((id) => {
        const product = products.find((p) => p.id === id);
        const supplierPrice = product?.ProductSupplier?.supplierPrice;
        const costPrice = product?.costPrice;
        return {
          productId: id,
          quantity: quantities[id] || 1,
          priceAtPurchase: Number(supplierPrice ?? costPrice ?? 0),
        };
      }),
    [selectedIds, quantities, products]
  );

  const openModal = (type: 'purchase' | 'return') => {
    setModalType(type);
    setShowCreateModal(true);
  };

  const totalSelected = selectedItems.reduce(
    (sum, it) =>
      sum + (it.priceAtPurchase || 0) * (it.quantity || 1),
    0
  );

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Шапка с информацией о поставщике */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Поставщик</div>
          <div className="text-lg font-semibold text-gray-900">{supplier.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Выбрано</div>
          <div className="text-lg font-bold text-gray-900">{selectedIds.size}</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товара по названию или артикулу..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Список товаров */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>{search ? 'Товары не найдены' : 'У поставщика нет товаров'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const supplierPrice = product.ProductSupplier?.supplierPrice;
              return (
                <div
                  key={product.id}
                  className={`p-3 transition-colors ${
                    isSelected ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Чекбокс */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(product.id)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors mt-1 ${
                        isSelected
                          ? 'bg-yellow-400 border-yellow-500 text-black'
                          : 'border-gray-300 hover:border-yellow-400 bg-white'
                      }`}
                      title={isSelected ? 'Снять выбор' : 'Выбрать товар'}
                    >
                      {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                    </button>

                    {/* Фото */}
                    <div className="flex-shrink-0">
                      {product.image ? (
                        <img
                          src={getImageUrl(product.image) || undefined}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.onerror = null;
                            el.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Текст */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 leading-tight">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{product.article}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {supplierPrice !== undefined && (
                          <span className="text-green-700 font-semibold">
                            {formatPrice(supplierPrice)} ₸
                          </span>
                        )}
                        <span className="text-gray-400">себ-ть {formatPrice(product.costPrice)} ₸</span>
                      </div>
                    </div>

                    {/* Кол-во */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Кол-во</label>
                        <input
                          type="number"
                          min={1}
                          value={quantities[product.id] || 1}
                          onChange={(e) => setQuantity(product.id, Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Действия снизу */}
      {canCreate && (
        <div className="border-t border-gray-200 p-4 bg-white">
          {selectedIds.size > 0 && (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Итого по выбранным:</span>
              <span className="font-bold text-gray-900">{formatPrice(totalSelected)} ₸</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => openModal('purchase')}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Создать заявку
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => openModal('return')}
              className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
              Оформить возврат
            </button>
          </div>
        </div>
      )}

      {/* Модалка создания заявки/возврата */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setSelectedIds(new Set());
          setQuantities({});
          setShowCreateModal(false);
          onOrderSuccess?.();
        }}
        type={modalType}
        initialSupplierId={supplier.id}
        initialItems={selectedItems}
      />
    </div>
  );
};
