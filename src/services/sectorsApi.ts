import { Sector, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const sectorsApi = {
  // Получить все сектора
  getAll: async (): Promise<Sector[]> => {
    const response = await fetch(`${API_BASE_URL}/sectors`);
    
    if (!response.ok) {
      throw new Error('Ошибка при получении секторов');
    }
    
    const data: ApiResponse<Sector[]> = await response.json();
    return data.data || [];
  },

  // Получить сектор по ID
  getById: async (id: number): Promise<Sector> => {
    const response = await fetch(`${API_BASE_URL}/sectors/${id}`);
    
    if (!response.ok) {
      throw new Error('Ошибка при получении сектора');
    }
    
    const data: ApiResponse<Sector> = await response.json();
    if (!data.data) {
      throw new Error('Сектор не найден');
    }
    
    return data.data;
  },

  // Создать новый сектор
  create: async (sectorData: Partial<Sector>): Promise<Sector> => {
    const response = await fetch(`${API_BASE_URL}/sectors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sectorData),
    });
    
    const data: ApiResponse<Sector> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при создании сектора');
    }
    
    return data.data!;
  },

  // Обновить сектор
  update: async (id: number, sectorData: Partial<Sector>): Promise<Sector> => {
    const response = await fetch(`${API_BASE_URL}/sectors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sectorData),
    });
    
    const data: ApiResponse<Sector> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при обновлении сектора');
    }
    
    return data.data!;
  },

  // Удалить сектор
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sectors/${id}`, {
      method: 'DELETE',
    });
    
    const data: ApiResponse<void> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ошибка при удалении сектора');
    }
  },
};
