import api from '../utils/api';
import type { Product, ApiResponse } from '../types';

export interface LinkProductSupplierDto {
  supplierId: number;
  supplierPrice: number;
  quantity?: number;
  isAvailable?: boolean;
  notes?: string;
}

class ProductsApi {
  private baseUrl = '/products';

  async getProducts(params?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
    excludeSupplierId?: number;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.excludeSupplierId !== undefined) {
      queryParams.append('excludeSupplierId', String(params.excludeSupplierId));
    }

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ products: Product[]; pagination: any }>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товаров');
    }

    return response.data.data.products;
  }

  async getProductById(id: number): Promise<Product> {
    const response = await api.get<ApiResponse<{ product: Product }>>(`${this.baseUrl}/${id}`);

    if (!response.data.success || !response.data.data?.product) {
      throw new Error(response.data.message || 'Ошибка получения товара');
    }

    return response.data.data.product;
  }

  async linkProductToSupplier(productId: number, data: LinkProductSupplierDto): Promise<void> {
    const response = await api.post<ApiResponse<unknown>>(`${this.baseUrl}/${productId}/suppliers`, {
      supplierId: data.supplierId,
      supplierPrice: data.supplierPrice,
      quantity: data.quantity ?? 0,
      isAvailable: data.isAvailable ?? true,
      notes: data.notes ?? '',
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Ошибка привязки товара к поставщику');
    }
  }
}

const productsApi = new ProductsApi();
export default productsApi;
