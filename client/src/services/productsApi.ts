import api from '../utils/api';
import type {
  ApiResponse,
  Product,
  ProductLifecyclePurchase,
  ProductLaunchFlags,
  ProductHistoryPage,
  ProductWarehouseDetails,
} from '../types';

export interface ProductLifecycleOperations {
  purchase: ProductLifecyclePurchase | null;
  warehouseDetails: ProductWarehouseDetails | null;
  arrivalRecovery: {
    status: 'available' | 'ambiguous';
    receiptId?: number;
    receivedQuantity?: number;
    receivedAt?: string;
    message?: string;
  } | null;
}

export interface ProductSearchPage {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CompleteProductWarehouseDto {
  sector: string;
  shelf: string;
  cell: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  costPrice?: number;
  notes?: string;
}

export interface UpdateProductWarehouseDetailsDto {
  sector: string;
  shelf: string;
  cell: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  notes?: string;
}

export interface ProductSaleLaunchDto {
  internalAdvertisingStarted: boolean;
  externalAdvertisingStarted: boolean;
  reviewBonusEnabled: boolean;
  sellerBonusEnabled: boolean;
  notes?: string;
}

export interface LinkProductSupplierDto {
  supplierId: number;
  supplierPrice: number;
  quantity?: number;
  isAvailable?: boolean;
  notes?: string;
}

class ProductsApi {
  private baseUrl = '/products';

  async getProductsPage(params?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
    excludeSupplierId?: number;
    supplierStatus?: 'without';
  }): Promise<ProductSearchPage> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params?.page !== undefined) queryParams.append('page', String(params.page));
    if (params?.excludeSupplierId !== undefined) {
      queryParams.append('excludeSupplierId', String(params.excludeSupplierId));
    }
    if (params?.supplierStatus) queryParams.append('supplierStatus', params.supplierStatus);

    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    const response = await api.get<ApiResponse<{ products: Product[]; pagination: any }>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товаров');
    }

    return response.data.data;
  }

  async getProducts(params?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
    excludeSupplierId?: number;
    supplierStatus?: 'without';
  }): Promise<Product[]> {
    const result = await this.getProductsPage(params);
    return result.products;
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

  async getProductHistory(productId: number, page = 1, limit = 50): Promise<ProductHistoryPage> {
    const response = await api.get<ApiResponse<ProductHistoryPage>>(
      `${this.baseUrl}/${productId}/history?page=${page}&limit=${limit}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения истории товара');
    }
    return response.data.data;
  }

  async getLifecycleOperations(productId: number): Promise<ProductLifecycleOperations> {
    const response = await api.get<ApiResponse<ProductLifecycleOperations>>(
      `${this.baseUrl}/${productId}/lifecycle/operations`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения данных закупа и склада');
    }
    return response.data.data;
  }

  async reconcileProductArrival(productId: number): Promise<void> {
    const response = await api.post<ApiResponse<unknown>>(
      `${this.baseUrl}/${productId}/lifecycle/reconcile-arrival`
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Ошибка восстановления этапа склада');
    }
  }

  async completeProductWarehouse(
    productId: number,
    data: CompleteProductWarehouseDto
  ): Promise<ProductWarehouseDetails> {
    const response = await api.post<ApiResponse<{ warehouseDetails: ProductWarehouseDetails }>>(
      `${this.baseUrl}/${productId}/lifecycle/complete-warehouse`,
      data
    );
    if (!response.data.success || !response.data.data?.warehouseDetails) {
      throw new Error(response.data.message || 'Ошибка сохранения складского паспорта');
    }
    return response.data.data.warehouseDetails;
  }

  async updateProductWarehouseDetails(
    productId: number,
    data: UpdateProductWarehouseDetailsDto
  ): Promise<ProductWarehouseDetails> {
    const response = await api.put<ApiResponse<{ warehouseDetails: ProductWarehouseDetails }>>(
      `${this.baseUrl}/${productId}/warehouse-details`,
      data
    );
    if (!response.data.success || !response.data.data?.warehouseDetails) {
      throw new Error(response.data.message || 'Ошибка сохранения места хранения');
    }
    return response.data.data.warehouseDetails;
  }

  async getProductLaunchFlags(productId: number): Promise<ProductLaunchFlags> {
    const response = await api.get<ApiResponse<{ launchFlags: ProductLaunchFlags }>>(
      `${this.baseUrl}/${productId}/launch-flags`
    );
    if (!response.data.success || !response.data.data?.launchFlags) {
      throw new Error(response.data.message || 'Ошибка получения параметров продаж');
    }
    return response.data.data.launchFlags;
  }

  async completeProductSaleLaunch(
    productId: number,
    data: ProductSaleLaunchDto
  ): Promise<ProductLaunchFlags> {
    const response = await api.post<ApiResponse<{ launchFlags: ProductLaunchFlags }>>(
      `${this.baseUrl}/${productId}/lifecycle/complete-sale-launch`,
      data
    );
    if (!response.data.success || !response.data.data?.launchFlags) {
      throw new Error(response.data.message || 'Ошибка завершения запуска продаж');
    }
    return response.data.data.launchFlags;
  }

  async updateProductLaunchFlags(
    productId: number,
    data: ProductSaleLaunchDto
  ): Promise<ProductLaunchFlags> {
    const response = await api.put<ApiResponse<{ launchFlags: ProductLaunchFlags }>>(
      `${this.baseUrl}/${productId}/launch-flags`,
      data
    );
    if (!response.data.success || !response.data.data?.launchFlags) {
      throw new Error(response.data.message || 'Ошибка обновления параметров продаж');
    }
    return response.data.data.launchFlags;
  }
}

const productsApi = new ProductsApi();
export default productsApi;
