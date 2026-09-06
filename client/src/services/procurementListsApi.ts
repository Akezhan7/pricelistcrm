import api from '../utils/api';
import type { ApiResponse, Product } from '../types';

export type ProcurementListUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

export type ProcurementSupplier = {
  id: number;
  name: string;
};

export type ProcurementSupplierRecommendation = {
  source: 'last_successful_purchase' | 'preferred_supplier' | 'single_linked_supplier' | 'none';
  supplier: ProcurementSupplier | null;
  purchasePrice: number | null;
  purchasedAt: string | null;
};

export type ProcurementListItem = {
  id: number;
  procurementListId: number;
  productId: number;
  requestedQuantity: number;
  observedStock: number | null;
  notes: string | null;
  selectedSupplierId: number | null;
  purchasePrice: number | string | null;
  selectedSupplier: (ProcurementSupplier & { isActive: boolean }) | null;
  supplierRecommendation: ProcurementSupplierRecommendation;
  product: Pick<Product, 'id' | 'name' | 'internalName' | 'article' | 'image'> & {
    suppliers?: Array<ProcurementSupplier & {
      isActive: boolean;
      ProductSupplier?: { supplierPrice: number | string; isPreferred: boolean };
    }>;
  };
  addedBy: ProcurementListUser;
  createdAt: string;
  updatedAt: string;
};

export type ProcurementList = {
  id: number;
  status: 'open' | 'processed' | 'cancelled';
  creator: ProcurementListUser;
  items: ProcurementListItem[];
  createdAt: string;
  updatedAt: string;
};

export type ProcurementListItemInput = {
  requestedQuantity?: number;
  observedStock?: number | null;
  notes?: string | null;
  selectedSupplierId?: number | null;
  purchasePrice?: number | null;
};

export type ProcurementListData = {
  list: ProcurementList | null;
  suppliers: ProcurementSupplier[];
};

export type ProcurementCreatedOrder = {
  id: number;
  orderNumber: string;
  totalAmount: number | string;
  supplier: ProcurementSupplier;
  itemCount: number;
};

export type ProcurementOrderCreationData = ProcurementListData & {
  orders: ProcurementCreatedOrder[];
  blocked: Array<{
    itemId: number;
    supplierId: number | null;
    reason: string;
  }>;
};

function unwrapData(response: { data: ApiResponse<ProcurementListData> }) {
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Не удалось обновить закупочный лист');
  }
  return response.data.data;
}

class ProcurementListsApi {
  private baseUrl = '/procurement-lists/current';

  async getCurrent(): Promise<ProcurementListData> {
    const response = await api.get<ApiResponse<ProcurementListData>>(this.baseUrl);
    return unwrapData(response);
  }

  async addItem(
    productId: number,
    input: ProcurementListItemInput
  ): Promise<ProcurementListData> {
    const response = await api.post<ApiResponse<ProcurementListData>>(
      `${this.baseUrl}/items`,
      { productId, ...input }
    );
    return unwrapData(response);
  }

  async updateItem(
    itemId: number,
    input: ProcurementListItemInput
  ): Promise<ProcurementListData> {
    const response = await api.patch<ApiResponse<ProcurementListData>>(
      `${this.baseUrl}/items/${itemId}`,
      input
    );
    return unwrapData(response);
  }

  async deleteItem(itemId: number): Promise<ProcurementListData> {
    const response = await api.delete<ApiResponse<ProcurementListData>>(
      `${this.baseUrl}/items/${itemId}`
    );
    return unwrapData(response);
  }

  async createOrders(): Promise<ProcurementOrderCreationData> {
    const response = await api.post<ApiResponse<ProcurementOrderCreationData>>(
      this.baseUrl + '/create-orders'
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Не удалось создать заявки');
    }
    return response.data.data;
  }
}

const procurementListsApi = new ProcurementListsApi();
export default procurementListsApi;
