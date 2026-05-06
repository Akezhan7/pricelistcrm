import api from '../utils/api';
import { Row, ApiResponse } from '../types';

export const rowsApi = {
  getAll: async (sectorId?: number): Promise<Row[]> => {
    const url = sectorId ? `/rows?sectorId=${sectorId}` : '/rows';
    const response = await api.get<ApiResponse<Row[]>>(url);
    return response.data.data || [];
  },

  getById: async (id: number): Promise<Row> => {
    const response = await api.get<ApiResponse<Row>>(`/rows/${id}`);
    if (!response.data.data) throw new Error('Ряд не найден');
    return response.data.data;
  },

  create: async (rowData: Partial<Row>): Promise<Row> => {
    const response = await api.post<ApiResponse<Row>>('/rows', rowData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка при создании ряда');
    }
    return response.data.data;
  },

  update: async (id: number, rowData: Partial<Row>): Promise<Row> => {
    const response = await api.put<ApiResponse<Row>>(`/rows/${id}`, rowData);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка при обновлении ряда');
    }
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/rows/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Ошибка при удалении ряда');
    }
  },

  updateOccupancy: async (id: number): Promise<{ occupiedSpaces: number; totalSpaces: number }> => {
    const response = await api.put<ApiResponse<{ occupiedSpaces: number; totalSpaces: number }>>(
      `/rows/${id}/update-occupancy`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка при обновлении заполненности ряда');
    }
    return response.data.data;
  },
};
