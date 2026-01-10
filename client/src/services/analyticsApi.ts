import api from '../utils/api';
import type { 
  StockAnalytics, 
  PurchaseSuggestions,
  ApiResponse 
} from '../types';

/**
 * API сервис для аналитики
 */
class AnalyticsApi {
  private baseUrl = '/analytics';

  /**
   * Получить аналитику по остаткам товаров
   */
  async getStockAnalytics(params?: {
    categoryId?: number;
    supplierId?: number;
  }): Promise<StockAnalytics> {
    const queryParams = new URLSearchParams();
    
    if (params?.categoryId) {
      queryParams.append('categoryId', params.categoryId.toString());
    }
    if (params?.supplierId) {
      queryParams.append('supplierId', params.supplierId.toString());
    }

    const url = queryParams.toString() 
      ? `${this.baseUrl}/stock-analytics?${queryParams}` 
      : `${this.baseUrl}/stock-analytics`;
    
    const response = await api.get<ApiResponse<any>>(url);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения аналитики остатков');
    }
    
    const data = response.data.data;
    
    // Трансформируем структуру API в ожидаемую фронтендом
    return {
      critical: data.critical || [],
      low: data.low || [],
      medium: data.medium || [],
      good: data.good || [],
      stats: {
        totalProducts: data.statistics?.total || 0,
        criticalCount: data.statistics?.critical || 0,
        lowCount: data.statistics?.low || 0,
        mediumCount: data.statistics?.medium || 0,
        goodCount: data.statistics?.good || 0,
      }
    } as StockAnalytics;
  }

  /**
   * Получить рекомендации по закупке товаров
   */
  async getPurchaseSuggestions(params?: {
    minPriority?: 'critical' | 'high' | 'medium';
    categoryId?: number;
  }): Promise<PurchaseSuggestions> {
    const queryParams = new URLSearchParams();
    
    if (params?.minPriority) {
      queryParams.append('minPriority', params.minPriority);
    }
    if (params?.categoryId) {
      queryParams.append('categoryId', params.categoryId.toString());
    }

    const url = queryParams.toString() 
      ? `${this.baseUrl}/purchase-suggestions?${queryParams}` 
      : `${this.baseUrl}/purchase-suggestions`;
    
    const response = await api.get<ApiResponse<PurchaseSuggestions>>(url);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения рекомендаций по закупке');
    }
    
    return response.data.data;
  }

  /**
   * Получить товары с низким остатком
   */
  async getLowStockProducts(params?: {
    categoryId?: number;
    supplierId?: number;
    limit?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.categoryId) {
      queryParams.append('categoryId', params.categoryId.toString());
    }
    if (params?.supplierId) {
      queryParams.append('supplierId', params.supplierId.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const url = queryParams.toString() 
      ? `/products/low-stock?${queryParams}` 
      : `/products/low-stock`;
    
    const response = await api.get<ApiResponse<any>>(url);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения товаров с низким остатком');
    }
    
    return response.data.data;
  }
}

export default new AnalyticsApi();
