import api from '../utils/api';
import type {
  Order,
  OrdersResponse,
  CreateOrderDto,
  UpdateOrderDto,
  ChangeOrderStatusDto,
  OrderFilters,
  ApiResponse
} from '../types';

/**
 * API сервис для работы с заявками
 */
class OrdersApi {
  private baseUrl = '/orders';

  /**
   * Получить список заявок с фильтрацией и пагинацией
   */
  async getOrders(filters?: OrderFilters): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.supplierId) params.append('supplierId', filters.supplierId.toString());
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
    }

    const url = params.toString() ? `${this.baseUrl}?${params}` : this.baseUrl;
    const response = await api.get<ApiResponse<OrdersResponse>>(url);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения заявок');
    }
    
    return response.data.data;
  }

  /**
   * Получить детальную информацию о заявке по ID
   */
  async getOrderById(id: number): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`${this.baseUrl}/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения заявки');
    }
    
    return response.data.data;
  }

  /**
   * Создать новую заявку
   */
  async createOrder(data: CreateOrderDto): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(this.baseUrl, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка создания заявки');
    }
    
    return response.data.data;
  }

  /**
   * Обновить заявку
   * Можно редактировать только если статус = "В работе"
   */
  async updateOrder(id: number, data: UpdateOrderDto): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`${this.baseUrl}/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка обновления заявки');
    }
    
    return response.data.data;
  }

  /**
   * Изменить статус заявки
   */
  async changeOrderStatus(id: number, data: ChangeOrderStatusDto): Promise<{
    order: Order;
    statusHistory: any;
  }> {
    const response = await api.patch<ApiResponse<{
      order: Order;
      statusHistory: any;
    }>>(`${this.baseUrl}/${id}/status`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка изменения статуса');
    }
    
    return response.data.data;
  }

  /**
   * Обновить оплату заявки
   */
  async updateOrderPayment(id: number, amount: number, comment?: string): Promise<{
    order: Order;
    payment: {
      amount: string;
      newPaidAmount: string;
      remainingAmount: string;
      statusChanged: boolean;
      oldStatus: string;
      newStatus: string;
    };
  }> {
    const response = await api.patch<ApiResponse<{
      order: Order;
      payment: {
        amount: string;
        newPaidAmount: string;
        remainingAmount: string;
        statusChanged: boolean;
        oldStatus: string;
        newStatus: string;
      };
    }>>(`${this.baseUrl}/${id}/payment`, {
      amount,
      comment
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка регистрации оплаты');
    }
    
    return response.data.data;
  }

  /**
   * Получить историю платежей по заказу
   */
  async getOrderPayments(id: number): Promise<{
    order: Order;
    payments: any[];
  }> {
    const response = await api.get<ApiResponse<{
      order: Order;
      payments: any[];
    }>>(`${this.baseUrl}/${id}/payments`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения истории платежей');
    }
    
    return response.data.data;
  }

  /**
   * Удалить заявку (мягкое удаление)
   * Можно удалить только если статус = "В работе" и paymentStatus = "Не оплачено"
   */
  async deleteOrder(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Ошибка удаления заявки');
    }
  }
}

// Экспортируем синглтон
export default new OrdersApi();
