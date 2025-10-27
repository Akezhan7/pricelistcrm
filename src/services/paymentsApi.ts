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
  totalDebt: string;
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

// Получить список всех платежей с фильтрацией
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

// Получить все платежи конкретного поставщика
export const getPaymentsBySupplier = async (supplierId: number): Promise<SupplierPaymentData> => {
  const response = await api.get(`/payments/supplier/${supplierId}`);
  return response.data.data;
};

// Получить информацию о конкретном платеже
export const getPaymentById = async (id: number): Promise<Payment> => {
  const response = await api.get(`/payments/${id}`);
  return response.data.data.payment;
};

// Создать новый платеж
export const createPayment = async (data: CreatePaymentData): Promise<Payment> => {
  const response = await api.post('/payments', data);
  return response.data.data;
};

// Обновить существующий платеж
export const updatePayment = async (id: number, data: UpdatePaymentData): Promise<Payment> => {
  const response = await api.put(`/payments/${id}`, data);
  return response.data.data;
};

// Удалить платеж
export const deletePayment = async (id: number): Promise<void> => {
  await api.delete(`/payments/${id}`);
};

// Вспомогательные функции для форматирования
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