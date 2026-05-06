import api from '../utils/api';
import type {
  PendingReceiptOrder,
  WarehouseReceipt,
  ReceiveOrderDto,
  StockHistoryResponse,
  ApiResponse
} from '../types';

class WarehouseApi {
  private baseUrl = '/warehouse';

  async getPendingReceipts(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ orders: PendingReceiptOrder[]; pagination: any }> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = queryParams.toString()
      ? `${this.baseUrl}/pending-receipts?${queryParams}`
      : `${this.baseUrl}/pending-receipts`;

    const response = await api.get<ApiResponse<{ orders: PendingReceiptOrder[]; pagination: any }>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения заявок на приёмку');
    }

    return response.data.data;
  }

  async receiveOrder(orderId: number, data: ReceiveOrderDto): Promise<WarehouseReceipt> {
    const response = await api.post<ApiResponse<WarehouseReceipt>>(
      `${this.baseUrl}/receive/${orderId}`,
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка приёмки товара');
    }

    return response.data.data;
  }

  async getStockReport(params?: {
    categoryId?: number;
    status?: 'critical' | 'low' | 'medium' | 'good';
    search?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params?.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const url = queryParams.toString()
      ? `${this.baseUrl}/stock-report?${queryParams}`
      : `${this.baseUrl}/stock-report`;

    const response = await api.get<ApiResponse<any>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения отчёта по остаткам');
    }

    return response.data.data;
  }

  async getProductStockHistory(
    productId: number,
    params?: {
      page?: number;
      limit?: number;
      changeType?: string;
    }
  ): Promise<StockHistoryResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.changeType) queryParams.append('changeType', params.changeType);

    const url = queryParams.toString()
      ? `/products/${productId}/stock-history?${queryParams}`
      : `/products/${productId}/stock-history`;

    const response = await api.get<ApiResponse<StockHistoryResponse>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения истории остатков');
    }

    return response.data.data;
  }
}

const warehouseApi = new WarehouseApi();
export default warehouseApi;
