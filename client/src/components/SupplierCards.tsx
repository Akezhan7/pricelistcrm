import React, { useState } from 'react';
import { Supplier, Product } from '../types';
import { MessageSquare, Phone, MapPin, Package, Plus, Edit, Trash2, Image as ImageIcon, CreditCard, FileText, DollarSign } from 'lucide-react';
import { CreateSupplierModal } from './CreateSupplierModal';
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
};

export const SupplierCards: React.FC<SupplierCardsProps> = ({
  suppliers,
  selectedProduct,
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [financeSupplier, setFinanceSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    <div className="flex flex-col h-full">
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

      {/* Карточки поставщиков */}
      <div className="flex-1 overflow-y-auto p-4">
        {suppliers.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-2">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p>
              {selectedProduct
                ? 'Поставщики для этого товара не найдены'
                : 'Поставщики не добавлены'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map((supplier) => {
              // Находим цену для выбранного товара
              const productPrice = selectedProduct
                ? supplier.products?.find(p => p.id === selectedProduct.id)?.ProductSupplier
                : null;

              return (
                <div key={supplier.id} className="card p-4 hover:shadow-lg transition-shadow">
                  {/* Изображение контейнера */}
                  <div className="mb-3">
                    {supplier.containerImage ? (
                      <img
                        src={getImageUrl(supplier.containerImage) || undefined}
                        alt={`Контейнер ${supplier.name}`}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={handleImgError}
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Основная информация */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {supplier.name}
                    </h3>
                    
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
                      onClick={() => handleWhatsApp(supplier.whatsapp || supplier.phone)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      title="Написать в WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </button>
                    
                    <button
                      onClick={() => handleCall(supplier.phone)}
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
                        onClick={() => setFinanceSupplier(supplier)}
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
                        onClick={() => {
                          setEditingSupplier(supplier);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Редактировать поставщика"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
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

      {/* Модальное окно создания поставщика */}
      <CreateSupplierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onRefresh}
        selectedProduct={selectedProduct}
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
