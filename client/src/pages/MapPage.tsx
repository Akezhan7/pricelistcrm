import React, { useState, useEffect } from 'react';
import { BaysideMap } from '../components/BaysideMap';
import { Layout } from '../components/Layout';
import suppliersApi from '../services/suppliersApi';
import { Supplier } from '../types';

export const MapPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await suppliersApi.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Ошибка загрузки поставщиков');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button
              onClick={fetchSuppliers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <BaysideMap suppliers={suppliers} />
    </Layout>
  );
};
