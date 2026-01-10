import React, { useMemo, useState, useEffect } from 'react';
import { Product } from '../types';
import { Plus, Edit, Trash2, Image as ImageIcon, Users, Settings, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { CreateProductModal } from './CreateProductModal';
import { EditProductModal } from './EditProductModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ProductSuppliersModal } from './ProductSuppliersModal';
import { ProductVariationsModal } from './ProductVariationsModal';
import { PriceHistoryModal } from './PriceHistoryModal';
import api from '../utils/api';
import getImageUrl from '../utils/image';

type ProductListProps = {
  products: Product[];
  searchQuery: string;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onRefresh: () => void;
  canEdit: boolean;
};

export const ProductList: React.FC<ProductListProps> = ({
  products,
  searchQuery,
  selectedProduct,
  onSelectProduct,
  onRefresh,
  canEdit,
}) => {
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const el = e.currentTarget;
    el.onerror = null;
    // use local placeholder to avoid external network/DNS dependency
    el.src = '/placeholder.svg';
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Новые состояния для управления поставщиками и вариациями
  const [productForSuppliers, setProductForSuppliers] = useState<Product | null>(null);
  const [productForVariations, setProductForVariations] = useState<Product | null>(null);
  // Состояние для истории цен
  const [productForPriceHistory, setProductForPriceHistory] = useState<Product | null>(null);
  // Локальный поиск по товарам
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, localSearchQuery]);

  // Фильтрация товаров по поисковому запросу (глобальный + локальный)
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Сначала применяем глобальный поиск из Header
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.article.toLowerCase().includes(query)
      );
    }
    
    // Затем применяем локальный поиск
    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.article.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [products, searchQuery, localSearchQuery]);

  // Пагинация товаров
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      onRefresh();
      
      // Если удаляемый товар выбран, сбрасываем выбор
      if (selectedProduct?.id === productToDelete.id) {
        onSelectProduct(null);
      }
      
      setProductToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
      // Здесь можно добавить уведомление об ошибке
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Кнопка добавления товара */}
      {canEdit && (
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Добавить товар
          </button>
        </div>
      )}

      {/* Поле поиска по товарам */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск по названию или артикулу..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {localSearchQuery && (
            <button
              onClick={() => setLocalSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Список товаров */}
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>
              {(searchQuery || localSearchQuery) ? 'Товары не найдены' : 'Товары не добавлены'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedProduct?.id === product.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
                onClick={() => onSelectProduct(
                  selectedProduct?.id === product.id ? null : product
                )}
              >
                <div className="flex items-start space-x-3">
                  {/* Изображение товара */}
                  <div className="flex-shrink-0">
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image) || undefined}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={handleImgError}
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Информация о товаре */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Артикул: {product.article}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs">
                        <span className="text-gray-500">Себестоимость:</span>
                        <span className="text-gray-900 font-medium ml-1">
                          {formatPrice(product.costPrice)} ₸
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Продажа:</span>
                        <span className="text-green-600 font-medium ml-1">
                          {formatPrice(product.sellingPrice)} ₸
                        </span>
                      </div>
                    </div>

                    {/* Количество поставщиков */}
                    {product.suppliers && product.suppliers.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Поставщиков: {product.suppliers.length}
                      </p>
                    )}
                  </div>
                </div>

                {/* Кнопки управления для админа */}
                {canEdit && (
                  <div className="flex justify-end space-x-2 mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductForPriceHistory(product);
                      }}
                      className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                      title="История цен"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductForSuppliers(product);
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Управление поставщиками"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductForVariations(product);
                      }}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Управление вариациями"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(product);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Редактировать товар"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(product);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Удалить товар"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {filteredProducts.length} товаров
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания товара */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onRefresh}
      />

      {/* Модальное окно редактирования товара */}
      <EditProductModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSuccess={() => {
          onRefresh();
          setEditingProduct(null);
        }}
        product={editingProduct}
      />

      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
        loading={isDeleting}
        title="Удалить товар"
        message="Вы уверены, что хотите удалить этот товар?"
        itemName={productToDelete?.name}
      />

      {/* Модальное окно управления поставщиками */}
      <ProductSuppliersModal
        isOpen={!!productForSuppliers}
        onClose={() => setProductForSuppliers(null)}
        onSuccess={() => {
          onRefresh();
          // Обновляем выбранный товар если он совпадает с редактируемым
          if (selectedProduct?.id === productForSuppliers?.id) {
            // Перезагрузить сведения о товаре
            onSelectProduct(null);
            // Можно было бы перезагрузить конкретные данные, но для простоты перезагружаем все
          }
        }}
        product={productForSuppliers}
      />

      {/* Модальное окно управления вариациями */}
      <ProductVariationsModal
        isOpen={!!productForVariations}
        onClose={() => setProductForVariations(null)}
        onSuccess={() => {
          onRefresh();
          // Обновляем выбранный товар если он совпадает с редактируемым
          if (selectedProduct?.id === productForVariations?.id) {
            onSelectProduct(null);
          }
        }}
        product={productForVariations}
      />

      {/* Модальное окно истории цен */}
      <PriceHistoryModal
        isOpen={!!productForPriceHistory}
        onClose={() => setProductForPriceHistory(null)}
        productId={productForPriceHistory?.id || 0}
        productName={productForPriceHistory?.name || ''}
      />
    </div>
  );
};
