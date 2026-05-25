import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Product } from '../types';
import { MessageSquare, Phone, MapPin, Package, Plus, Edit, Trash2, Image as ImageIcon, DollarSign, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { UnifiedSupplierForm } from './UnifiedSupplierForm';
import { EditSupplierModal } from './EditSupplierModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { SupplierFinanceModal } from './SupplierFinanceModal';
import api from '../utils/api';
import getImageUrl from '../utils/image';

type SupplierCardsProps = {
  suppliers: Supplier[];
  selectedProduct: Product | null;
  onRefresh: () => void;
  canEdit: boolean;
  /** Если задан — карточка поставщика становится кликабельной (для master-detail UX) */
  onSelectSupplier?: (supplier: Supplier) => void;
  /** Подсветить выбранного поставщика */
  selectedSupplierId?: number | null;
};

export const SupplierCards: React.FC<SupplierCardsProps> = ({
  suppliers,
  selectedProduct,
  onRefresh,
  canEdit,
  onSelectSupplier,
  selectedSupplierId,
}) => {
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const el = e.currentTarget;
    el.onerror = null;
    // use local placeholder to avoid external network/DNS dependency
    el.src = '/placeholder.svg';
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [financeSupplier, setFinanceSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Локальный поиск по поставщикам
  const [searchQuery, setSearchQuery] = useState('');
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProduct, searchQuery]);

  // Фильтрация поставщиков по поисковому запросу
  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.phone?.toLowerCase().includes(query) ||
      supplier.address?.toLowerCase().includes(query) ||
      supplier.sector?.toLowerCase().includes(query) ||
      supplier.row?.toString().toLowerCase().includes(query) ||
      supplier.container?.toString().toLowerCase().includes(query)
    );
  });

  // Пагинация поставщиков
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`);
      onRefresh();
      setSupplierToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления поставщика:', error);
      // Здесь можно добавить уведомление об ошибке
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
      {/* Кнопка добавления поставщика */}
      {canEdit && (
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Добавить поставщика
          </button>
        </div>
      )}

      {/* Поле поиска по поставщикам */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск по названию, телефону, адресу, сектору..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Карточки поставщиков */}
      <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
        {filteredSuppliers.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-2">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p>
              {searchQuery
                ? 'Поставщики не найдены'
                : selectedProduct
                ? 'Поставщики для этого товара не найдены'
                : 'Поставщики не добавлены'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 lg:gap-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
            {paginatedSuppliers.map((supplier) => {
              // Находим цену для выбранного товара
              const productPrice = selectedProduct
                ? supplier.products?.find(p => p.id === selectedProduct.id)?.ProductSupplier
                : null;

              const isSelected = selectedSupplierId === supplier.id;
              return (
                <div
                  key={supplier.id}
                  className={`card p-3 lg:p-4 hover:shadow-lg transition-shadow ${
                    onSelectSupplier ? 'cursor-pointer' : ''
                  } ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}
                  onClick={() => onSelectSupplier?.(supplier)}
                >
                  {/* Изображение контейнера */}
                  <div className="mb-2 lg:mb-3">
                    {supplier.containerImage ? (
                      <img
                        src={getImageUrl(supplier.containerImage) || undefined}
                        alt={`Контейнер ${supplier.name}`}
                        className="w-full h-28 lg:h-32 object-cover rounded-lg"
                        onError={handleImgError}
                      />
                    ) : (
                      <div className="w-full h-28 lg:h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 lg:h-8 lg:w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Основная информация */}
                  <div className="mb-3 lg:mb-4">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-1 truncate">
                      {supplier.name}
                    </h3>
                                        {/* Информация о рынке */}
                    {supplier.market && (
                      <div className="flex items-center text-sm text-blue-600 mb-2">
                        <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="font-medium">{supplier.market.name}</span>
                      </div>
                    )}
                                        <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {supplier.row || supplier.container ? (
                          <>
                            {supplier.row ? `Ряд ${supplier.row}` : ''}
                            {supplier.row && supplier.container ? ', ' : ''}
                            {supplier.container ? `Контейнер ${supplier.container}` : ''}
                          </>
                        ) : (
                          supplier.address || '—'
                        )}
                      </span>
                    </div>

                    {supplier.sector && (
                      <div className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mb-2">
                        {supplier.sector}
                      </div>
                    )}
                  </div>

                  {/* Цена для выбранного товара */}
                  {selectedProduct && productPrice && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-green-800">
                        Цена: {formatPrice(productPrice.supplierPrice)} ₸
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        В наличии: {productPrice.quantity} шт.
                        {!productPrice.isAvailable && (
                          <span className="text-red-500 ml-2">• Недоступно</span>
                        )}
                      </div>
                      {productPrice.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {productPrice.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Общее количество товаров */}
                  {!selectedProduct && supplier.products && supplier.products.length > 0 && (
                    <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="h-4 w-4 mr-1" />
                        <span>Товаров: {supplier.products.length}</span>
                      </div>
                    </div>
                  )}

                  {/* Кнопки связи */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsApp(supplier.whatsapp || supplier.phone);
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      title="Написать в WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCall(supplier.phone);
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      title="Позвонить"
                    >
                      <Phone className="h-4 w-4" />
                      Звонок
                    </button>
                  </div>

                  {/* Номер телефона */}
                  <div className="text-xs text-gray-500 text-center mb-3">
                    {supplier.phone}
                  </div>

                  {/* Финансовый блок */}
                  <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">Финансы</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFinanceSupplier(supplier);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Управление финансами"
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {supplier.debt && supplier.debt > 0 ? (
                      <div className="text-sm">
                        <div className="text-red-600 font-medium">
                          Задолженность: {formatPrice(supplier.debt)} ₸
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-green-600 font-medium">
                        Задолженности нет
                      </div>
                    )}
                  </div>

                  {/* Заметки */}
                  {supplier.notes && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3">
                      {supplier.notes}
                    </div>
                  )}

                  {/* Кнопки редактирования для админа */}
                  {canEdit && (
                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSupplier(supplier);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Редактировать поставщика"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSupplierToDelete(supplier);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Удалить поставщика"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="space-y-2">
            <div className="text-xs text-gray-500 text-center">
              Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredSuppliers.length)} из {filteredSuppliers.length}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Первая"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Номера страниц */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white font-medium'
                          : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Последняя"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания поставщика */}
      <UnifiedSupplierForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onRefresh}
        mode={selectedProduct ? 'with-product' : 'standalone'}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
      />

      {/* Модальное окно редактирования поставщика */}
      <EditSupplierModal
        isOpen={!!editingSupplier}
        onClose={() => setEditingSupplier(null)}
        onSuccess={() => {
          onRefresh();
          setEditingSupplier(null);
        }}
        supplier={editingSupplier}
      />

      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmModal
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleDeleteSupplier}
        loading={isDeleting}
        title="Удалить поставщика"
        message="Вы уверены, что хотите удалить этого поставщика?"
        itemName={supplierToDelete?.name}
      />

      {/* Модальное окно финансов поставщика */}
      <SupplierFinanceModal
        isOpen={!!financeSupplier}
        onClose={() => setFinanceSupplier(null)}
        supplierId={financeSupplier?.id || 0}
        supplierName={financeSupplier?.name || ''}
        onSuccess={() => {
          onRefresh();
          setFinanceSupplier(null);
        }}
      />
    </div>
  );
};
