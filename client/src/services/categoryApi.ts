import api from '../utils/api';
import type { Category, ApiResponse } from '../types';

class CategoryApi {
  private baseUrl = '/categories';

  async getCategories(params?: { isActive?: boolean }): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ categories: Category[] }>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения категорий');
    }

    return response.data.data.categories;
  }

  async getCategoriesTree(): Promise<Category[]> {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>(`${this.baseUrl}/tree`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения дерева категорий');
    }

    return response.data.data.categories;
  }

  async getCategoryById(id: number): Promise<Category> {
    const response = await api.get<ApiResponse<{ category: Category }>>(`${this.baseUrl}/${id}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения категории');
    }

    return response.data.data.category;
  }

  async createCategory(data: {
    name: string;
    description?: string;
    parentId?: number;
    isActive?: boolean;
  }): Promise<Category> {
    const response = await api.post<ApiResponse<{ category: Category }>>(this.baseUrl, data);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка создания категории');
    }

    return response.data.data.category;
  }

  async updateCategory(id: number, data: {
    name?: string;
    description?: string;
    parentId?: number;
    isActive?: boolean;
  }): Promise<Category> {
    const response = await api.put<ApiResponse<{ category: Category }>>(`${this.baseUrl}/${id}`, data);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка обновления категории');
    }

    return response.data.data.category;
  }

  async deleteCategory(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Ошибка удаления категории');
    }
  }
}

const categoryApi = new CategoryApi();
export default categoryApi;
