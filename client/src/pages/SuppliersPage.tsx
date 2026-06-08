import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SupplierCards } from '../components/SupplierCards';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Supplier } from '../types';
import api from '../utils/api';
import { Building2, RefreshCw } from 'lucide-react';
import { IconButton, Spinner } from '../components/ui';

const API_LIST_LIMIT = 1000;

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useUI();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/suppliers?limit=${API_LIST_LIMIT}`);
      setSuppliers(res.data.data.suppliers);
    } catch (error) {
      console.error('Ошибка загрузки поставщиков:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const supplierCountLabel =
    suppliers.length === 1
      ? 'поставщик'
      : suppliers.length < 5
        ? 'поставщика'
        : 'поставщиков';

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Spinner size="lg" color="brand" />
          <p className="text-text-muted">Загрузка поставщиков...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="w-full h-full flex flex-col min-h-0">
        {/* Mobile sticky page header */}
        <div className="md:hidden sticky top-0 z-10 -mx-4 px-4 py-3 mb-3 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15">
                <Building2 className="h-5 w-5 text-brand-yellow-dark" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-section-title font-bold tracking-tight text-brand-black truncate">
                  Поставщики
                </h1>
                <p className="text-caption text-text-muted mt-0.5">
                  {suppliers.length} {supplierCountLabel}
                </p>
              </div>
            </div>
            <IconButton
              icon={RefreshCw}
              title="Обновить"
              size="md"
              variant="ghost"
              onClick={fetchSuppliers}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-brand-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
          <div className="hidden md:flex px-5 py-4 border-b border-border-subtle flex-row items-center justify-between gap-3 bg-brand-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15">
                <Building2 className="h-5 w-5 text-brand-yellow-dark" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-h1 font-bold tracking-tight text-brand-black truncate">
                  Поставщики
                </h1>
                <p className="text-caption text-text-muted mt-0.5">
                  {suppliers.length} {supplierCountLabel}
                </p>
              </div>
            </div>
            <IconButton
              icon={RefreshCw}
              title="Обновить"
              size="md"
              variant="ghost"
              onClick={fetchSuppliers}
            />
          </div>
          <SupplierCards
            suppliers={suppliers}
            selectedProduct={null}
            onRefresh={fetchSuppliers}
            canEdit={user?.role === 'admin' || user?.role === 'purchase_manager'}
            onSelectSupplier={(s) => navigate(`/suppliers/${s.id}`)}
          />
        </div>
      </div>
    </Layout>
  );
};
