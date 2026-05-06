import api from '../utils/api';
import type { CollectorTask, CollectorTasksResponse, UpdateCollectorTaskDto, ApiResponse } from '../types';

class CollectorApi {
  private baseUrl = '/collector';

  async getMyTasks(params?: {
    status?: 'pending' | 'in_progress' | 'completed';
    page?: number;
    limit?: number;
  }): Promise<CollectorTasksResponse> {
    const queryParams = new URLSearchParams();

    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = queryParams.toString() ? `${this.baseUrl}/tasks?${queryParams}` : `${this.baseUrl}/tasks`;
    const response = await api.get<ApiResponse<CollectorTasksResponse>>(url);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка получения заданий');
    }

    return response.data.data;
  }

  async startTask(taskId: number): Promise<CollectorTask> {
    const response = await api.put<ApiResponse<CollectorTask>>(`${this.baseUrl}/tasks/${taskId}/start`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка запуска задания');
    }

    return response.data.data;
  }

  async completeTask(taskId: number, data?: UpdateCollectorTaskDto): Promise<CollectorTask> {
    const response = await api.put<ApiResponse<CollectorTask>>(
      `${this.baseUrl}/tasks/${taskId}/complete`,
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка завершения задания');
    }

    return response.data.data;
  }

  async updateTask(taskId: number, data: UpdateCollectorTaskDto): Promise<CollectorTask> {
    const response = await api.put<ApiResponse<CollectorTask>>(
      `${this.baseUrl}/tasks/${taskId}`,
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Ошибка обновления задания');
    }

    return response.data.data;
  }
}

const collectorApi = new CollectorApi();
export default collectorApi;
