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
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  IconButton,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui';
import { Pagination } from '../components/Pagination';
import collectorApi from '../services/collectorApi';
import { collectorTaskStatusColors } from '../theme/statusColors';
import { useToast } from '../context/ToastContext';
import type { CollectorTask, CollectorTaskStatus } from '../types';
import { cn } from '../utils/cn';

interface StatCardProps {
  label: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full rounded-xl border bg-brand-white p-4 text-left transition-all duration-150',
      'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2',
      active
        ? 'border-brand-yellow/40 border-l-[3px] border-l-brand-yellow bg-brand-yellow/10'
        : 'border-border-subtle hover:border-border'
    )}
  >
    <p className="text-caption font-medium text-text-muted">{label}</p>
    <p className="mt-1 text-h2 font-bold tabular-nums tracking-tight text-brand-black">{value}</p>
  </button>
);

const FILTER_OPTIONS: { value: CollectorTaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все задания' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Завершено' },
];

export const CollectorTasks: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CollectorTask[]>([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [filterStatus, setFilterStatus] = useState<CollectorTaskStatus | 'all'>('all');
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadTasks();
  }, [filterStatus, pagination.page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await collectorApi.getMyTasks({
        status: filterStatus === 'all' ? undefined : filterStatus,
        page: pagination.page,
        limit: pagination.limit,
      });
      setTasks(data.tasks);
      setStats(data.stats);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Ошибка загрузки заданий:', error);
      toast.error('Не удалось загрузить задания');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleStartTask = async (taskId: number) => {
    try {
      setProcessingTaskId(taskId);
      await collectorApi.startTask(taskId);
      await loadTasks();
      toast.success('Сбор начат');
    } catch (error) {
      console.error('Ошибка запуска задания:', error);
      toast.error('Не удалось начать задание');
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleCompleteTask = async (taskId: number, notes?: string) => {
    try {
      setProcessingTaskId(taskId);
      await collectorApi.completeTask(taskId, notes ? { notes } : undefined);
      await loadTasks();
      toast.success('Задание завершено');
    } catch (error) {
      console.error('Ошибка завершения задания:', error);
      toast.error('Не удалось завершить задание');
    } finally {
      setProcessingTaskId(null);
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
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" color="brand" useLucide />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Мои задания на сбор"
          description="Задания на сбор товара у поставщиков"
          icon={ClipboardList}
          actions={
            <IconButton icon={RefreshCw} title="Обновить" variant="default" onClick={loadTasks} />
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Ожидают"
            value={stats.pending}
            active={filterStatus === 'pending'}
            onClick={() => setFilterStatus('pending')}
          />
          <StatCard
            label="В работе"
            value={stats.inProgress}
            active={filterStatus === 'in_progress'}
            onClick={() => setFilterStatus('in_progress')}
          />
          <StatCard
            label="Завершено"
            value={stats.completed}
            active={filterStatus === 'completed'}
            onClick={() => setFilterStatus('completed')}
          />
        </div>

        <Card variant="inset" className="shadow-none">
          <CardBody className="p-4">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CollectorTaskStatus | 'all')}
              className="max-w-xs"
              aria-label="Фильтр по статусу"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <EmptyState
                icon={ClipboardList}
                title={
                  filterStatus === 'all'
                    ? 'Заданий пока нет'
                    : `Нет заданий со статусом «${getStatusLabel(filterStatus as CollectorTaskStatus)}»`
                }
              />
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} variant="elevated">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle>Заявка {task.order?.orderNumber}</CardTitle>
                    <Badge statusClass={collectorTaskStatusColors[task.status]}>
                      <span className="inline-flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        {getStatusLabel(task.status)}
                      </span>
                    </Badge>
                  </div>
                  {task.notes && (
                    <p className="mt-2 flex items-start gap-1.5 text-caption text-text-muted">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {task.notes}
                    </p>
                  )}
                </CardHeader>

                <CardBody className="space-y-4">
                  {task.order?.supplier && (
                    <div className="rounded-xl bg-surface-inset p-4">
                      <p className="text-overline text-text-muted">Поставщик</p>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="flex items-center gap-2 text-body">
                          <Package className="h-4 w-4 shrink-0 text-text-muted" />
                          <span className="text-body-medium text-brand-black">
                            {task.order.supplier.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-body">
                          <Phone className="h-4 w-4 shrink-0 text-text-muted" />
                          <a
                            href={`tel:${task.order.supplier.phone}`}
                            className="text-accent-blue hover:underline"
                          >
                            {task.order.supplier.phone}
                          </a>
                        </div>
                        {task.order.supplier.address && (
                          <div className="flex items-center gap-2 text-body md:col-span-2">
                            <MapPin className="h-4 w-4 shrink-0 text-text-muted" />
                            <span className="text-text-muted">{task.order.supplier.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {task.order?.items && task.order.items.length > 0 && (
                    <div>
                      <p className="text-overline text-text-muted">
                        Товары для сбора ({task.order.items.length})
                      </p>
                      <div className="mt-2 space-y-2">
                        {task.order.items.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-brand-white px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-body-medium text-brand-black">
                                {index + 1}. {item.product?.name}
                              </p>
                              {item.product?.article && (
                                <p className="text-caption text-text-muted">
                                  Артикул: {item.product.article}
                                </p>
                              )}
                            </div>
                            <p className="shrink-0 text-body-medium tabular-nums text-brand-black">
                              {item.quantity} шт
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 border-t border-border-subtle pt-4">
                    {task.status === 'pending' && (
                      <Button
                        variant="primary"
                        leftIcon={PlayCircle}
                        onClick={() => handleStartTask(task.id)}
                        loading={processingTaskId === task.id}
                      >
                        Начать сбор
                      </Button>
                    )}

                    {task.status === 'in_progress' && !task.isCollected && (
                      <Button
                        variant="primary"
                        leftIcon={CheckCircle2}
                        onClick={() => handleCompleteTask(task.id)}
                        loading={processingTaskId === task.id}
                      >
                        Товар собран
                      </Button>
                    )}

                    {task.isCollected && task.collectedAt && (
                      <div className="flex items-center gap-2 text-caption text-success-dark">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Собрано {new Date(task.collectedAt).toLocaleString('ru-RU')}</span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>

        {pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
          />
        )}

        <Alert variant="info" icon={ClipboardList} title="Инструкция для сборщика:">
          <ul className="list-inside list-disc space-y-1">
            <li>Нажмите «Начать сбор», когда приступаете к заданию</li>
            <li>Проверьте все товары из списка у поставщика</li>
            <li>После сбора всех товаров нажмите «Товар собран»</li>
            <li>При возникновении проблем свяжитесь с менеджером</li>
          </ul>
        </Alert>
      </div>
    </Layout>
  );
};
