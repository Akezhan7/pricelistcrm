import api from '../utils/api';
import type { Supplier, ApiResponse } from '../types';

/**
 * API сервис для работы с поставщиками
 */
class SuppliersApi {
  private baseUrl = '/suppliers';

  /**
   * Получить список всех активных поставщиков
   */
  async getSuppliers(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<Supplier[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.isActive !== undefined) {
      queryParams.append('isActive', params.isActive.toString());
    }

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ suppliers: Supplier[], pagination: any }>>(url);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения поставщиков');
    }
    
    // Backend возвращает { suppliers: [...], pagination: {...} }
    return response.data.data.suppliers;
  }

  /**
   * Получить ВСЕ поставщики без пагинации (alias для getSuppliers)
   */
  async getAllSuppliers(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<Supplier[]> {
    return this.getSuppliers(params);
  }

  /**
   * Получить поставщика по ID
   */
  async getSupplierById(id: number): Promise<Supplier> {
    const response = await api.get<ApiResponse<Supplier>>(`${this.baseUrl}/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения поставщика');
    }
    
    return response.data.data;
  }
}

export default new SuppliersApi();
