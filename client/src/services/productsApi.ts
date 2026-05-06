import api from '../utils/api';
import type { Product, ApiResponse } from '../types';

class ProductsApi {
  private baseUrl = '/products';

  async getProducts(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ products: Product[]; pagination: any }>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товаров');
    }

    return response.data.data.products;
  }

  async getProductById(id: number): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товара');
    }

    return response.data.data;
  }
}

const productsApi = new ProductsApi();
export default productsApi;
