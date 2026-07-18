import tasksApi from './tasksApi';
import api from '../utils/api';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('tasksApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads tasks with compact query params', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          tasks: [],
          stats: {},
          pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        },
      },
    });

    await tasksApi.getTasks({ scope: 'assigned', status: 'new', page: 2 });

    expect(mockedApi.get).toHaveBeenCalledWith('/tasks?scope=assigned&status=new&page=2');
  });

  test('loads tasks with search query', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          tasks: [],
          stats: {},
          pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        },
      },
    });

    await tasksApi.getTasks({ search: 'kaspi sku' });

    expect(mockedApi.get).toHaveBeenCalledWith('/tasks?search=kaspi+sku');
  });

  test('creates a task through the tasks endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { task: { id: 1 } } },
    });

    await tasksApi.createTask({
      title: 'Позвонить поставщику',
      assignedToUserId: 2,
      priority: 'high',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/tasks', {
      title: 'Позвонить поставщику',
      assignedToUserId: 2,
      priority: 'high',
    });
  });

  test('sends status action comments to the action endpoint', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { success: true, data: { task: { id: 1 } } },
    });

    await tasksApi.returnTask(1, 'Нужно добавить ссылку');

    expect(mockedApi.patch).toHaveBeenCalledWith('/tasks/1/return', {
      comment: 'Нужно добавить ссылку',
    });
  });
  test('updates task fields through the task endpoint', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { success: true, data: { task: { id: 1 } } },
    });

    await tasksApi.updateTask(1, {
      title: 'Обновить документацию',
      assignedToUserId: 3,
      priority: 'normal',
    });

    expect(mockedApi.patch).toHaveBeenCalledWith('/tasks/1', {
      title: 'Обновить документацию',
      assignedToUserId: 3,
      priority: 'normal',
    });
  });

  test('adds a discussion comment to a task', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { comment: { id: 10 } } },
    });

    await tasksApi.addComment(1, 'Проверил, можно принимать');

    expect(mockedApi.post).toHaveBeenCalledWith('/tasks/1/comments', {
      comment: 'Проверил, можно принимать',
    });
  });
});
