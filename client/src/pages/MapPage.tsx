import React, { useState, useEffect } from 'react';
import { BaysideMap } from '../components/BaysideMap';
import { Layout } from '../components/Layout';
import { ErrorState, Spinner } from '../components/ui';
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
          <Spinner size="lg" color="brand" useLucide />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorState message={error} onRetry={fetchSuppliers} retryLabel="Попробовать снова" />
      </Layout>
    );
  }

  return (
    <Layout fullHeight>
      <BaysideMap suppliers={suppliers} />
    </Layout>
  );
};
