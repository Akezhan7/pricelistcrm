import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, DollarSign, FileText, Phone, MessageSquare, MapPin, Building2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { SupplierProductsPanel } from '../components/SupplierProductsPanel';
import { SupplierFinanceModal } from '../components/SupplierFinanceModal';
import { ReconciliationModal } from '../components/ReconciliationModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Supplier } from '../types';

export const SupplierDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'purchase_manager';

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinance, setShowFinance] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);

  const fetchSupplier = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data.data.supplier);
    } catch (error) {
      console.error('Ошибка загрузки поставщика:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatPrice = (n?: number) =>
    new Intl.NumberFormat('ru-RU').format(Number(n) || 0);

  const handleWhatsApp = () => {
    if (!supplier) return;
    const phone = (supplier.whatsapp || supplier.phone || '').replace(/\D/g, '');
    if (!phone) return;
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleCall = () => {
    if (!supplier?.phone) return;
    window.open(`tel:${supplier.phone}`, '_self');
  };

  if (loading || !supplier) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullHeight>
      <div className="h-full flex flex-col gap-4" style={{ minHeight: 0 }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => navigate('/suppliers')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к поставщикам
          </button>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setShowFinance(true)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Финансы / оплата
              </button>
            )}
            <button
              onClick={() => setShowReconciliation(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
            >
              <FileText className="h-4 w-4" />
              Сверка
            </button>
            <button
              onClick={fetchSupplier}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Обновить"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Шапка поставщика */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2 flex-wrap">
                {supplier.market && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {supplier.market.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {supplier.row || supplier.container
                    ? `${supplier.row ? `Ряд ${supplier.row}` : ''}${
                        supplier.row && supplier.container ? ', ' : ''
                      }${supplier.container ? `Контейнер ${supplier.container}` : ''}`
                    : supplier.address || '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {supplier.phone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </button>
              <button
                onClick={handleCall}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Phone className="h-4 w-4" />
                Звонок
              </button>
            </div>
          </div>

          <div className="mt-4 inline-block px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-300">
            <span className="text-sm text-gray-700">Задолженность: </span>
            <span className="font-bold text-gray-900 text-lg">
              {formatPrice(supplier.debt)} ₸
            </span>
          </div>
        </div>

        {/* Товары поставщика с чекбоксами + кнопки заявка/возврат */}
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col flex-1"
          style={{ minHeight: 0 }}
        >
          <SupplierProductsPanel
            supplier={supplier}
            canCreate={canEdit}
            onOrderSuccess={fetchSupplier}
          />
        </div>
      </div>

      {/* Модальное окно финансов / чек / оплата */}
      <SupplierFinanceModal
        isOpen={showFinance}
        onClose={() => setShowFinance(false)}
        supplierId={supplier.id}
        supplierName={supplier.name}
        onSuccess={fetchSupplier}
      />

      {/* Модальное окно сверки */}
      <ReconciliationModal
        isOpen={showReconciliation}
        onClose={() => setShowReconciliation(false)}
        supplierId={supplier.id}
        supplierName={supplier.name}
      />
    </Layout>
  );
};
