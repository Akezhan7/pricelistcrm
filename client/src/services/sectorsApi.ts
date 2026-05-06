import api from '../utils/api';
import { Sector, ApiResponse } from '../types';

export const sectorsApi = {
  getAll: async (): Promise<Sector[]> => {
    const response = await api.get<ApiResponse<Sector[]>>('/sectors');
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Sector> => {
    const response = await api.get<ApiResponse<Sector>>(`/sectors/${id}`);
    if (!response.data.data) throw new Error('Сектор не найден');
    return response.data.data;
  },

  create: async (sectorData: Partial<Sector>): Promise<Sector> => {
    const response = await api.post<ApiResponse<Sector>>('/sectors', sectorData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка при создании сектора');
    }
    return response.data.data;
  },

  update: async (id: number, sectorData: Partial<Sector>): Promise<Sector> => {
    const response = await api.put<ApiResponse<Sector>>(`/sectors/${id}`, sectorData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка при обновлении сектора');
    }
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/sectors/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Ошибка при удалении сектора');
    }
  },
};
