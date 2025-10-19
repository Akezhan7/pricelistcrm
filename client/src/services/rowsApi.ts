import { Row, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const rowsApi = {
  // Получить все ряды (с возможностью фильтрации по сектору)
  getAll: async (sectorId?: number): Promise<Row[]> => {
    const url = sectorId 
      ? `${API_BASE_URL}/rows?sectorId=${sectorId}`
      : `${API_BASE_URL}/rows`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Ошибка при получении рядов');
    }
    
    const data: ApiResponse<Row[]> = await response.json();
    return data.data || [];
  },

  // Получить ряд по ID
  getById: async (id: number): Promise<Row> => {
    const response = await fetch(`${API_BASE_URL}/rows/${id}`);
    
    if (!response.ok) {
      throw new Error('Ошибка при получении ряда');
    }
    
    const data: ApiResponse<Row> = await response.json();
    if (!data.data) {
      throw new Error('Ряд не найден');
    }
    
    return data.data;
  },

  // Создать новый ряд
  create: async (rowData: Partial<Row>): Promise<Row> => {
    const response = await fetch(`${API_BASE_URL}/rows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rowData),
    });
    
    const data: ApiResponse<Row> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при создании ряда');
    }
    
    return data.data!;
  },

  // Обновить ряд
  update: async (id: number, rowData: Partial<Row>): Promise<Row> => {
    const response = await fetch(`${API_BASE_URL}/rows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rowData),
    });
    
    const data: ApiResponse<Row> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при обновлении ряда');
    }
    
    return data.data!;
  },

  // Удалить ряд
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/rows/${id}`, {
      method: 'DELETE',
    });
    
    const data: ApiResponse<void> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при удалении ряда');
    }
  },

  // Обновить заполненность ряда
  updateOccupancy: async (id: number): Promise<{ occupiedSpaces: number; totalSpaces: number }> => {
    const response = await fetch(`${API_BASE_URL}/rows/${id}/update-occupancy`, {
      method: 'PUT',
    });
    
    const data: ApiResponse<{ occupiedSpaces: number; totalSpaces: number }> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при обновлении заполненности ряда');
    }
    
    return data.data!;
  },
};
