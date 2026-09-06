import api from '../utils/api';

export interface Payment {
  id: number;
  supplierId: number;
  amount: string;
  paymentDate: string;
  paymentMethod: 'Наличные' | 'Перевод' | 'Карта' | 'Другое';
  comment?: string;
  createdBy: number;
  relatedOrderIds: number[];
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: number;
    name: string;
    phone?: string;
    debt: string;
  };
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreatePaymentData {
  supplierId: number;
  amount: number;
  paymentDate?: string;
  paymentMethod?: 'Наличные' | 'Перевод' | 'Карта' | 'Другое';
  comment?: string;
  orderIds?: number[];
  /** Файл чека (PDF или изображение). Если указан — запрос будет multipart/form-data. */
  receipt?: File | null;
}

export interface UpdatePaymentData {
  amount?: number;
  paymentDate?: string;
  paymentMethod?: 'Наличные' | 'Перевод' | 'Карта' | 'Другое';
  comment?: string;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  supplierId?: number;
  paymentMethod?: 'Наличные' | 'Перевод' | 'Карта' | 'Другое';
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentStats {
  totalPaid: string;
  balance: string;
  totalDebt: string;
  supplierAdvance: string;
  paymentsCount: number;
  unpaidOrdersCount: number;
}

export interface UnpaidOrder {
  id: number;
  orderNumber: string;
  totalAmount: string;
  paidAmount: string;
  paymentStatus: 'Не оплачено' | 'Частично оплачено' | 'Оплачено';
  createdAt: string;
}

export interface SupplierPaymentData {
  supplier: {
    id: number;
    name: string;
    debt: string;
  };
  payments: Payment[];
  unpaidOrders: UnpaidOrder[];
  stats: PaymentStats;
}

export const getPayments = async (filters?: PaymentFilters) => {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.supplierId) params.append('supplierId', filters.supplierId.toString());
  if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const url = `/payments${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

export const getPaymentsBySupplier = async (supplierId: number): Promise<SupplierPaymentData> => {
  const response = await api.get(`/payments/supplier/${supplierId}`);
  return response.data.data;
};

export const getPaymentById = async (id: number): Promise<Payment> => {
  const response = await api.get(`/payments/${id}`);
  return response.data.data.payment;
};

export const createPayment = async (data: CreatePaymentData): Promise<Payment> => {
  // Если есть файл чека — используем multipart/form-data, иначе обычный JSON.
  if (data.receipt) {
    const formData = new FormData();
    formData.append('supplierId', String(data.supplierId));
    formData.append('amount', String(data.amount));
    if (data.paymentDate) formData.append('paymentDate', data.paymentDate);
    if (data.paymentMethod) formData.append('paymentMethod', data.paymentMethod);
    if (data.comment) formData.append('comment', data.comment);
    if (data.orderIds && data.orderIds.length > 0) {
      formData.append('orderIds', JSON.stringify(data.orderIds));
    }
    formData.append('receipt', data.receipt);

    const response = await api.post('/payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  const { receipt, ...payload } = data;
  const response = await api.post('/payments', payload);
  return response.data.data;
};

export const updatePayment = async (id: number, data: UpdatePaymentData): Promise<Payment> => {
  const response = await api.put(`/payments/${id}`, data);
  return response.data.data;
};

export const deletePayment = async (id: number): Promise<void> => {
  await api.delete(`/payments/${id}`);
};

export const formatPaymentAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatPaymentDate = (date: string): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getPaymentMethodIcon = (method: string): string => {
  switch (method) {
    case 'Наличные':
      return '💵';
    case 'Перевод':
      return '🏦';
    case 'Карта':
      return '💳';
    case 'Другое':
      return '💼';
    default:
      return '💰';
  }
};

export const getPaymentMethodColor = (method: string): string => {
  switch (method) {
    case 'Наличные':
      return 'bg-green-100 text-green-800';
    case 'Перевод':
      return 'bg-blue-100 text-blue-800';
    case 'Карта':
      return 'bg-purple-100 text-purple-800';
    case 'Другое':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
