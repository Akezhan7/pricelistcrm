import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SupplierCards } from '../components/SupplierCards';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Supplier } from '../types';
import api from '../utils/api';
import { RefreshCw } from 'lucide-react';

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка поставщиков...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm" style={{ minHeight: 0 }}>
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Поставщики ({suppliers.length})</h1>
          <button
            onClick={fetchSuppliers}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <SupplierCards
          suppliers={suppliers}
          selectedProduct={null}
          onRefresh={fetchSuppliers}
          canEdit={user?.role === 'admin' || user?.role === 'purchase_manager'}
          onSelectSupplier={(s) => navigate(`/suppliers/${s.id}`)}
        />
      </div>
    </Layout>
  );
};
