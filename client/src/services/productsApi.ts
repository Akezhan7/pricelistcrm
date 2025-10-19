import api from '../utils/api';
import type { Product, ApiResponse } from '../types';

/**
 * API сервис для работы с товарами
 */
class ProductsApi {
  private baseUrl = '/products';

  /**
   * Получить список всех активных товаров
   */
  async getProducts(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.isActive !== undefined) {
      queryParams.append('isActive', params.isActive.toString());
    }

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ products: Product[], pagination: any }>>(url);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товаров');
    }
    
    // Backend возвращает { products: [...], pagination: {...} }
    return response.data.data.products;
  }

  /**
   * Получить товар по ID
   */
  async getProductById(id: number): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товара');
    }
    
    return response.data.data;
  }
}

// Экспортируем синглтон
export default new ProductsApi();
