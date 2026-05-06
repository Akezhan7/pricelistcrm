import api from '../utils/api';
import {
  ApiResponse,
  PriceHistoryResponse,
  PriceAnalytics,
  PriceHistory,
  UpdatePricesFromOrderDto,
  UpdatePricesResponse,
} from '../types';

export const getProductPriceHistory = async (
  productId: number,
  params?: {
    priceType?: 'costPrice' | 'sellingPrice';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }
): Promise<PriceHistoryResponse> => {
  const response = await api.get<ApiResponse<PriceHistoryResponse>>(
    `/products/${productId}/price-history`,
    { params }
  );
  return response.data.data!;
};

export const getPriceAnalytics = async (params?: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<PriceAnalytics> => {
  const response = await api.get<ApiResponse<PriceAnalytics>>(
    '/price-history/analytics',
    { params }
  );
  return response.data.data!;
};

export const getOrderPriceChanges = async (orderId: number): Promise<{
  order: { id: number; orderNumber: string };
  priceChanges: PriceHistory[];
}> => {
  const response = await api.get<
    ApiResponse<{
      order: { id: number; orderNumber: string };
      priceChanges: PriceHistory[];
    }>
  >(`/price-history/orders/${orderId}`);
  return response.data.data!;
};

export const updateProductPricesFromOrder = async (
  orderId: number,
  data: UpdatePricesFromOrderDto
): Promise<UpdatePricesResponse> => {
  const response = await api.patch<ApiResponse<UpdatePricesResponse>>(
    `/orders/${orderId}/update-prices`,
    data
  );
  return response.data.data!;
};
