import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  PlayCircle,
  MapPin,
  Phone,
  Package,
  AlertCircle,
  RefreshCw,
  Filter
} from 'lucide-react';
import collectorApi from '../services/collectorApi';
import type { CollectorTask, CollectorTaskStatus } from '../types';

export const CollectorTasks: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CollectorTask[]>([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [filterStatus, setFilterStatus] = useState<CollectorTaskStatus | 'all'>('all');
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
  }, [filterStatus]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await collectorApi.getMyTasks(
        filterStatus === 'all' ? undefined : filterStatus
      );
      setTasks(data.tasks);
      setStats(data.stats);
    } catch (error) {
      console.error('Ошибка загрузки заданий:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: number) => {
    try {
      setProcessingTaskId(taskId);
      await collectorApi.startTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Ошибка запуска задания:', error);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleCompleteTask = async (taskId: number, notes?: string) => {
    try {
      setProcessingTaskId(taskId);
      await collectorApi.completeTask(taskId, notes ? { notes } : undefined);
      await loadTasks();
    } catch (error) {
      console.error('Ошибка завершения задания:', error);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const getStatusColor = (status: CollectorTaskStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getStatusIcon = (status: CollectorTaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: CollectorTaskStatus) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'in_progress':
        return 'В работе';
      case 'completed':
        return 'Завершено';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Мои задания на сбор</h1>
          </div>
          <button
            onClick={loadTasks}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Ожидают</p>
                <p className="text-2xl font-bold text-gray-700">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">В работе</p>
                <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Завершено</p>
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Фильтр */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="input-field max-w-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CollectorTaskStatus | 'all')}
            >
              <option value="all">Все задания</option>
              <option value="pending">Ожидают</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Завершено</option>
            </select>
          </div>
        </div>

        {/* Список заданий */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {filterStatus === 'all' 
                  ? 'Заданий пока нет' 
                  : `Нет заданий со статусом "${getStatusLabel(filterStatus as CollectorTaskStatus)}"`}
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Заявка {task.order?.orderNumber}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {getStatusIcon(task.status)}
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    {task.notes && (
                      <p className="text-sm text-gray-600 mb-2">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Информация о поставщике */}
                {task.order?.supplier && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Информация о поставщике
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          {task.order.supplier.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a
                          href={`tel:${task.order.supplier.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {task.order.supplier.phone}
                        </a>
                      </div>
                      {task.order.supplier.address && (
                        <div className="flex items-center gap-2 text-sm md:col-span-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{task.order.supplier.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Список товаров */}
                {task.order?.items && task.order.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Товары для сбора ({task.order.items.length})
                    </h4>
                    <div className="space-y-2">
                      {task.order.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {index + 1}. {item.product?.name}
                            </p>
                            {item.product?.article && (
                              <p className="text-xs text-gray-500">
                                Артикул: {item.product.article}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {item.quantity} шт
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Кнопки действий */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      disabled={processingTaskId === task.id}
                      className="btn-primary flex items-center gap-2"
                    >
                      {processingTaskId === task.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      Начать сбор
                    </button>
                  )}

                  {task.status === 'in_progress' && !task.isCollected && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={processingTaskId === task.id}
                      className="btn-primary flex items-center gap-2"
                    >
                      {processingTaskId === task.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Товар собран
                    </button>
                  )}

                  {task.isCollected && task.collectedAt && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Собрано {new Date(task.collectedAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Подсказка */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <ClipboardList className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Инструкция для сборщика:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Нажмите "Начать сбор" когда приступаете к заданию</li>
                <li>Проверьте все товары из списка у поставщика</li>
                <li>После сбора всех товаров нажмите "Товар собран"</li>
                <li>При возникновении проблем свяжитесь с менеджером</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
