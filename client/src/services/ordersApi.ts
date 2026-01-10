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

  /**
   * Получить WhatsApp сообщение для отправки поставщику
   */
  async getWhatsAppMessage(id: number): Promise<{
    message: string;
    deepLink: string;
    supplier: {
      name: string;
      whatsapp: string;
    };
  }> {
    const response = await api.get<ApiResponse<{
      message: string;
      deepLink: string;
      supplier: {
        name: string;
        whatsapp: string;
      };
    }>>(`${this.baseUrl}/${id}/whatsapp-message`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка генерации WhatsApp сообщения');
    }
    
    return response.data.data;
  }

  /**
   * Отправить заявку поставщику через WhatsApp (генерация deep link)
   */
  async sendToWhatsApp(id: number): Promise<{
    deepLink: string;
    message: string;
    supplier: {
      id: number;
      name: string;
      whatsapp: string;
    };
  }> {
    const response = await api.post<ApiResponse<{
      deepLink: string;
      message: string;
      supplier: {
        id: number;
        name: string;
        whatsapp: string;
      };
    }>>(`${this.baseUrl}/${id}/send-whatsapp`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка отправки в WhatsApp');
    }
    
    return response.data.data;
  }

  /**
   * Полное подтверждение заявки поставщиком
   */
  async confirmOrder(id: number): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(`${this.baseUrl}/${id}/confirm`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка подтверждения заявки');
    }
    
    return response.data.data;
  }

  /**
   * Частичное подтверждение заявки
   */
  async partialConfirm(id: number, data: {
    items: Array<{
      productId: number;
      confirmedQuantity: number;
      isAvailable: boolean;
      supplierComment?: string;
    }>;
  }): Promise<{
    order: Order;
    confirmations: any[];
  }> {
    const response = await api.post<ApiResponse<{
      order: Order;
      confirmations: any[];
    }>>(`${this.baseUrl}/${id}/partial-confirm`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка частичного подтверждения');
    }
    
    return response.data.data;
  }

  /**
   * Назначить сборщика на заявку
   */
  async assignCollector(id: number, data: {
    collectorId: number;
    notes?: string;
  }): Promise<{
    order: Order;
    task: any;
  }> {
    const response = await api.post<ApiResponse<{
      order: Order;
      task: any;
    }>>(`${this.baseUrl}/${id}/assign-collector`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка назначения сборщика');
    }
    
    return response.data.data;
  }

  /**
   * Отметить что товар собран
   */
  async markAsCollected(id: number, notes?: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(
      `${this.baseUrl}/${id}/collect`,
      { notes }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка отметки сбора');
    }
    
    return response.data.data;
  }
}

// Экспортируем синглтон
export default new OrdersApi();
