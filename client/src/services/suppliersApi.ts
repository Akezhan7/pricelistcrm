import api from '../utils/api';
import type { Supplier, ApiResponse } from '../types';

class SuppliersApi {
  private baseUrl = '/suppliers';

  async getSuppliers(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<Supplier[]> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ suppliers: Supplier[]; pagination: any }>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения поставщиков');
    }

    return response.data.data.suppliers;
  }

  async getAllSuppliers(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<Supplier[]> {
    return this.getSuppliers(params);
  }

  async getSupplierById(id: number): Promise<Supplier> {
    const response = await api.get<ApiResponse<{ supplier: Supplier }>>(`${this.baseUrl}/${id}`);

    if (!response.data.success || !response.data.data?.supplier) {
      throw new Error(response.data.message || 'Ошибка получения поставщика');
    }

    return response.data.data.supplier;
  }

  async getReconciliation(id: number, from?: string, to?: string): Promise<ReconciliationReport> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const url = `${this.baseUrl}/${id}/reconciliation${params.toString() ? `?${params}` : ''}`;
    const response = await api.get<ApiResponse<ReconciliationReport>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка формирования сверки');
    }

    return response.data.data;
  }
}

export type ReconciliationMovementKind = 'purchase' | 'return' | 'payment';

export interface ReconciliationMovement {
  date: string;
  kind: ReconciliationMovementKind;
  documentNumber: string;
  purchase: number;
  returned: number;
  payment: number;
  comment?: string;
  balance: number;
  receiptUrl?: string | null;
}

export interface ReconciliationReport {
  supplier: {
    id: number;
    name: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    debt: number;
  };
  period: {
    from: string | null;
    to: string | null;
  };
  openingBalance: number;
  closingBalance: number;
  totals: {
    purchase: number;
    returned: number;
    payment: number;
  };
  movements: ReconciliationMovement[];
}

const suppliersApi = new SuppliersApi();
export default suppliersApi;
