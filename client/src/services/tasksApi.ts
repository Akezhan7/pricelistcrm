import api from '../utils/api';
import type {
  ApiResponse,
  CreateEmployeeTaskDto,
  EmployeeTask,
  EmployeeTaskComment,
  EmployeeTaskAttachment,
  EmployeeTaskFilters,
  EmployeeTasksResponse,
  UpdateEmployeeTaskDto,
} from '../types';

function appendParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value === 'boolean') {
    params.set(key, value ? 'true' : 'false');
    return;
  }
  params.set(key, String(value));
}

function unwrap<T>(response: { data: ApiResponse<T> }, fallbackMessage: string): T {
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || fallbackMessage);
  }
  return response.data.data;
}

class TasksApi {
  private baseUrl = '/tasks';

  async getTasks(filters: EmployeeTaskFilters = {}): Promise<EmployeeTasksResponse> {
    const params = new URLSearchParams();
    appendParam(params, 'scope', filters.scope);
    appendParam(params, 'search', filters.search);
    appendParam(params, 'status', filters.status);
    appendParam(params, 'priority', filters.priority);
    appendParam(params, 'assignedToUserId', filters.assignedToUserId);
    appendParam(params, 'createdByUserId', filters.createdByUserId);
    appendParam(params, 'overdue', filters.overdue);
    appendParam(params, 'page', filters.page);
    appendParam(params, 'limit', filters.limit);

    const response = await api.get<ApiResponse<EmployeeTasksResponse>>(
      `${this.baseUrl}${params.toString() ? `?${params}` : ''}`
    );
    return unwrap(response, 'Не удалось загрузить задачи');
  }

  async getTask(id: number): Promise<EmployeeTask> {
    const response = await api.get<ApiResponse<{ task: EmployeeTask }>>(`${this.baseUrl}/${id}`);
    return unwrap(response, 'Не удалось загрузить задачу').task;
  }

  async createTask(payload: CreateEmployeeTaskDto): Promise<EmployeeTask> {
    const response = await api.post<ApiResponse<{ task: EmployeeTask }>>(this.baseUrl, payload);
    return unwrap(response, 'Не удалось создать задачу').task;
  }

  async updateTask(id: number, payload: UpdateEmployeeTaskDto): Promise<EmployeeTask> {
    const response = await api.patch<ApiResponse<{ task: EmployeeTask }>>(`${this.baseUrl}/${id}`, payload);
    return unwrap(response, 'Не удалось обновить задачу').task;
  }

  async uploadAttachments(id: number, files: File[]): Promise<EmployeeTaskAttachment[]> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    const response = await api.post<ApiResponse<{ attachments: EmployeeTaskAttachment[] }>>(
      `${this.baseUrl}/${id}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return unwrap(response, 'Не удалось загрузить вложения').attachments;
  }

  async downloadAttachment(taskId: number, attachment: EmployeeTaskAttachment): Promise<void> {
    const blob = await this.getAttachmentBlob(taskId, attachment.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = attachment.originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async getAttachmentBlob(taskId: number, attachmentId: number): Promise<Blob> {
    const response = await api.get<Blob>(
      `${this.baseUrl}/${taskId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  async deleteAttachment(taskId: number, attachmentId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${taskId}/attachments/${attachmentId}`);
  }

  async addComment(id: number, comment: string): Promise<EmployeeTaskComment> {
    const response = await api.post<ApiResponse<{ comment: EmployeeTaskComment }>>(
      `${this.baseUrl}/${id}/comments`,
      { comment }
    );
    return unwrap(response, 'Не удалось добавить комментарий').comment;
  }

  async startTask(id: number): Promise<EmployeeTask> {
    const response = await api.patch<ApiResponse<{ task: EmployeeTask }>>(`${this.baseUrl}/${id}/start`);
    return unwrap(response, 'Не удалось начать задачу').task;
  }

  async submitForReview(id: number, comment?: string): Promise<EmployeeTask> {
    const response = await api.patch<ApiResponse<{ task: EmployeeTask }>>(
      `${this.baseUrl}/${id}/submit-review`,
      { comment }
    );
    return unwrap(response, 'Не удалось отправить задачу на проверку').task;
  }

  async approveTask(id: number, comment?: string): Promise<EmployeeTask> {
    const response = await api.patch<ApiResponse<{ task: EmployeeTask }>>(
      `${this.baseUrl}/${id}/approve`,
      { comment }
    );
    return unwrap(response, 'Не удалось принять задачу').task;
  }

  async returnTask(id: number, comment: string): Promise<EmployeeTask> {
    const response = await api.patch<ApiResponse<{ task: EmployeeTask }>>(
      `${this.baseUrl}/${id}/return`,
      { comment }
    );
    return unwrap(response, 'Не удалось вернуть задачу').task;
  }

  async cancelTask(id: number, comment?: string): Promise<EmployeeTask> {
    const response = await api.patch<ApiResponse<{ task: EmployeeTask }>>(
      `${this.baseUrl}/${id}/cancel`,
      { comment }
    );
    return unwrap(response, 'Не удалось отменить задачу').task;
  }
}

const tasksApi = new TasksApi();
export default tasksApi;
