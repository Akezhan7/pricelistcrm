import api from '../utils/api';
import type { ApiResponse } from '../types';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
}

class UsersApi {
  private baseUrl = '/auth';

  async getUsersByRole(role?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);

    const url = `${this.baseUrl}/users${params.toString() ? `?${params}` : ''}`;
    const response = await api.get<ApiResponse<UsersResponse>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения пользователей');
    }

    return response.data.data.users;
  }

  async getCollectors(): Promise<User[]> {
    return this.getUsersByRole('collector');
  }

  async getWarehouseOperators(): Promise<User[]> {
    return this.getUsersByRole('warehouse_operator');
  }

  async getPurchaseManagers(): Promise<User[]> {
    return this.getUsersByRole('purchase_manager');
  }
}

const usersApi = new UsersApi();
export default usersApi;
