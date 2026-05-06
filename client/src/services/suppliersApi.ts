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
    const response = await api.get<ApiResponse<Supplier>>(`${this.baseUrl}/${id}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения поставщика');
    }

    return response.data.data;
  }
}

const suppliersApi = new SuppliersApi();
export default suppliersApi;
