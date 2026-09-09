import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  ListTodo,
  MessageSquare,
  Paperclip,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { TaskAttachmentGallery } from '../components/TaskAttachmentGallery';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import tasksApi from '../services/tasksApi';
import usersApi, { type User } from '../services/usersApi';
import type {
  CreateEmployeeTaskDto,
  EmployeeTask,
  EmployeeTaskAttachment,
  EmployeeTaskAction,
  EmployeeTaskPriority,
  EmployeeTaskStatus,
  UpdateEmployeeTaskDto,
} from '../types';
import { USER_ROLE_LABELS, type UserRole } from '../constants/userRoles';
import { cn } from '../utils/cn';
import { isTaskImageAttachment } from '../utils/taskAttachments';

const PAGE_LIMIT = 20;

const TASK_STATUSES: Array<{ value: EmployeeTaskStatus; label: string }> = [
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'review', label: 'На проверке' },
  { value: 'returned', label: 'Возвращена' },
  { value: 'done', label: 'Выполнена' },
  { value: 'cancelled', label: 'Отменена' },
];

const TASK_PRIORITIES: Array<{ value: EmployeeTaskPriority; label: string }> = [
  { value: 'low', label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' },
  { value: 'urgent', label: 'Срочный' },
];

const ACTION_LABELS: Record<EmployeeTaskAction, string> = {
  start: 'Начать',
  submit_review: 'На проверку',
  approve: 'Принять',
  return: 'Вернуть',
  cancel: 'Отменить',
};

const HISTORY_ACTION_LABELS: Record<string, string> = {
  update: 'Редактирование задачи',
  reassign: 'Переназначение ответственного',
  create: 'Создание задачи',
  start: 'Начало работы',
  submit_review: 'Отправка на проверку',
  approve: 'Принятие задачи',
  return: 'Возврат на доработку',
  cancel: 'Отмена задачи',
};

const ACTION_ICONS: Record<EmployeeTaskAction, typeof PlayCircle> = {
  start: PlayCircle,
  submit_review: ClipboardCheck,
  approve: CheckCircle2,
  return: RotateCcw,
  cancel: XCircle,
};

const ACTION_VARIANTS: Record<EmployeeTaskAction, 'primary' | 'secondary' | 'destructive'> = {
  start: 'primary',
  submit_review: 'primary',
  approve: 'primary',
  return: 'secondary',
  cancel: 'destructive',
};

const EMPTY_FORM: CreateEmployeeTaskDto = {
  title: '',
  description: '',
  assignedToUserId: 0,
  priority: 'normal',
  dueDate: '',
  collaboratorUserIds: [],
};

const EMPTY_EDIT_FORM: UpdateEmployeeTaskDto & {
  title: string;
  description: string;
  assignedToUserId: number;
  priority: EmployeeTaskPriority;
  dueDate: string;
  comment: string;
  collaboratorUserIds: number[];
} = {
  title: '',
  description: '',
  assignedToUserId: 0,
  priority: 'normal',
  dueDate: '',
  comment: '',
  collaboratorUserIds: [],
};

function getStatusLabel(status: EmployeeTaskStatus) {
  return TASK_STATUSES.find((item) => item.value === status)?.label || status;
}

function getPriorityLabel(priority: EmployeeTaskPriority) {
  return TASK_PRIORITIES.find((item) => item.value === priority)?.label || priority;
}

function getHistoryActionLabel(action: string) {
  return HISTORY_ACTION_LABELS[action] || action;
}

function getStatusVariant(status: EmployeeTaskStatus): 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline' {
  if (status === 'done') return 'success';
  if (status === 'cancelled') return 'outline';
  if (status === 'returned') return 'warning';
  if (status === 'review') return 'info';
  if (status === 'in_progress') return 'default';
  return 'outline';
}

function getPriorityVariant(priority: EmployeeTaskPriority): 'default' | 'danger' | 'warning' | 'outline' {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'low') return 'outline';
  return 'default';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Не указано';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string | null) {
  if (!value) return 'Без срока';
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function getRoleLabel(role?: string) {
  return role && role in USER_ROLE_LABELS
    ? USER_ROLE_LABELS[role as UserRole]
    : 'Сотрудник';
}

function isOverdue(task: EmployeeTask) {
  return Boolean(
    task.dueDate &&
      !['done', 'cancelled'].includes(task.status) &&
      new Date(task.dueDate).getTime() < Date.now()
  );
}

function getDeadlineStyle(task: EmployeeTask) {
  if (!task.dueDate || ['done', 'cancelled'].includes(task.status)) {
    return 'border-border-subtle';
  }
  const due = new Date(task.dueDate).getTime();
  const created = new Date(task.createdAt).getTime();
  const remaining = due - Date.now();
  if (remaining <= 0) return 'border-danger/60 bg-danger/5';
  const ratio = remaining / Math.max(due - created, 1);
  if (ratio <= 0.15) return 'border-danger/50 bg-danger/5';
  if (ratio <= 0.35) return 'border-orange-400/60 bg-orange-50/50';
  if (ratio <= 0.65) return 'border-warning/60 bg-warning/5';
  return 'border-success/40 bg-success/5';
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(Math.round(size / 1024), 1)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function CollaboratorPicker({
  users,
  primaryUserId,
  value,
  onChange,
  disabled = false,
}: {
  users: User[];
  primaryUserId: number;
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}) {
  const availableUsers = users.filter((item) => item.id !== Number(primaryUserId));

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-body-medium text-brand-black">Соисполнители</legend>
      <div className="max-h-36 overflow-y-auto rounded-lg border border-border-subtle bg-brand-white p-2">
        {availableUsers.length === 0 ? (
          <p className="px-2 py-1 text-body text-text-muted">Других активных сотрудников нет.</p>
        ) : (
          availableUsers.map((item) => {
            const checked = value.includes(item.id);
            return (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-muted">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? value.filter((id) => id !== item.id) : [...value, item.id])}
                  className="h-4 w-4 accent-brand-yellow"
                />
                <span className="min-w-0 text-body text-brand-black">
                  {item.name} <span className="text-text-muted">· {getRoleLabel(item.role)}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="mt-1 text-caption text-text-muted">Соисполнители видят задачу, файлы и обсуждение. Этапы меняет основной ответственный.</p>
    </fieldset>
  );
}

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Partial<Record<EmployeeTaskStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingAction, setProcessingAction] = useState<EmployeeTaskAction | null>(null);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editAttachments, setEditAttachments] = useState<EmployeeTaskAttachment[]>([]);
  const [editAttachmentFiles, setEditAttachmentFiles] = useState<File[]>([]);
  const [loadingEditAttachments, setLoadingEditAttachments] = useState(false);
  const [uploadingEditAttachments, setUploadingEditAttachments] = useState(false);
  const [attachmentGallery, setAttachmentGallery] = useState<{
    taskId: number;
    attachments: EmployeeTaskAttachment[];
    initialAttachmentId: number;
  } | null>(null);
  const [reopenDetailsAfterEdit, setReopenDetailsAfterEdit] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [form, setForm] = useState<CreateEmployeeTaskDto>(EMPTY_FORM);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [filters, setFilters] = useState<{
    scope: 'all' | 'assigned' | 'created';
    search: string;
    status: EmployeeTaskStatus | '';
    priority: EmployeeTaskPriority | '';
    assignedToUserId: number | '';
    overdue: boolean;
    page: number;
  }>({
    scope: isAdmin ? 'all' : 'assigned',
    search: '',
    status: '',
    priority: '',
    assignedToUserId: '',
    overdue: false,
    page: 1,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 1,
  });

  const selectAttachmentFiles = (
    files: File[],
    existingCount: number,
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (existingCount + files.length > 10) {
      toast.error('К задаче можно прикрепить не больше 10 файлов');
      return;
    }
    if (files.some((file) => file.size > 20 * 1024 * 1024)) {
      toast.error('Размер одного файла не должен превышать 20 МБ');
      return;
    }
    setter(files);
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tasksApi.getTasks({
        ...filters,
        limit: PAGE_LIMIT,
      });
      setTasks(data.tasks);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
      toast.error('Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      setUsers(await usersApi.getUsersByRole());
    } catch (error) {
      console.error('Ошибка загрузки сотрудников:', error);
      toast.error('Не удалось загрузить сотрудников');
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const activeUsers = useMemo(() => users.filter((item) => item.isActive), [users]);
  const totalActiveTasks = useMemo(
    () => (stats.new || 0) + (stats.in_progress || 0) + (stats.review || 0) + (stats.returned || 0),
    [stats]
  );

  const updateFilters = (updates: Partial<typeof filters>) => {
    setFilters((current) => ({
      ...current,
      ...updates,
      assignedToUserId: updates.scope === 'assigned' ? '' : updates.assignedToUserId ?? current.assignedToUserId,
      page: updates.page ?? 1,
    }));
  };

  const openTask = async (taskId: number) => {
    setDetailsLoading(true);
    setActionComment('');
    try {
      setSelectedTask(await tasksApi.getTask(taskId));
    } catch (error) {
      console.error('Ошибка загрузки задачи:', error);
      toast.error('Не удалось открыть задачу');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.assignedToUserId || !form.dueDate) return;

    setCreating(true);
    try {
      const payload: CreateEmployeeTaskDto = {
        title: form.title.trim(),
        assignedToUserId: Number(form.assignedToUserId),
        priority: form.priority || 'normal',
        collaboratorUserIds: form.collaboratorUserIds || [],
      };
      if (form.description?.trim()) payload.description = form.description.trim();
      if (form.dueDate) payload.dueDate = form.dueDate;

      const created = await tasksApi.createTask(payload);
      let attachmentUploadFailed = false;
      if (pendingFiles.length > 0) {
        try {
          await tasksApi.uploadAttachments(created.id, pendingFiles);
        } catch (error) {
          attachmentUploadFailed = true;
          console.error('Задача создана, но вложения не загрузились:', error);
        }
      }
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setPendingFiles([]);
      if (attachmentUploadFailed) toast.error('Задача создана, но файлы не загрузились. Добавьте их из карточки задачи.');
      else toast.success('Задача создана');
      await loadTasks();
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      toast.error('Не удалось создать задачу');
    } finally {
      setCreating(false);
    }
  };

  const openEditTask = async (task: EmployeeTask, options: { closeDetails?: boolean } = {}) => {
    setEditTaskId(task.id);
    setReopenDetailsAfterEdit(Boolean(options.closeDetails));
    setEditAttachments(task.attachments || []);
    setEditAttachmentFiles([]);
    if (options.closeDetails) {
      setSelectedTask(null);
    }
    setEditForm({
      title: task.title,
      description: task.description || '',
      assignedToUserId: task.assignedToUserId,
      priority: task.priority,
      dueDate: toDateInputValue(task.dueDate),
      comment: '',
      collaboratorUserIds: (task.assignees || [])
        .filter((item) => item.assignmentRole === 'collaborator')
        .map((item) => item.id),
    });
    setEditOpen(true);
    setLoadingEditAttachments(true);
    try {
      const detailedTask = await tasksApi.getTask(task.id);
      setEditAttachments(detailedTask.attachments || []);
    } catch (error) {
      console.error('Ошибка загрузки вложений задачи:', error);
      toast.error('Не удалось загрузить вложения задачи');
    } finally {
      setLoadingEditAttachments(false);
    }
  };

  const handleUpdateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTaskId || !editForm.title.trim() || !editForm.assignedToUserId) return;

    setEditing(true);
    try {
      const payload: UpdateEmployeeTaskDto = {
        title: editForm.title.trim(),
        description: editForm.description?.trim() || null,
        assignedToUserId: Number(editForm.assignedToUserId),
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
        collaboratorUserIds: editForm.collaboratorUserIds,
      };
      if (editForm.comment?.trim()) payload.comment = editForm.comment.trim();

      const updated = await tasksApi.updateTask(editTaskId, payload);
      if (reopenDetailsAfterEdit) {
        setSelectedTask(updated);
      }
      setEditOpen(false);
      setEditTaskId(null);
      setEditForm(EMPTY_EDIT_FORM);
      setEditAttachments([]);
      setEditAttachmentFiles([]);
      setReopenDetailsAfterEdit(false);
      toast.success('Задача обновлена');
      await loadTasks();
    } catch (error) {
      console.error('Ошибка редактирования задачи:', error);
      toast.error('Не удалось обновить задачу');
    } finally {
      setEditing(false);
    }
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTask || !commentText.trim()) return;

    setAddingComment(true);
    try {
      await tasksApi.addComment(selectedTask.id, commentText.trim());
      setCommentText('');
      setSelectedTask(await tasksApi.getTask(selectedTask.id));
      toast.success('Комментарий добавлен');
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      toast.error('Не удалось добавить комментарий');
    } finally {
      setAddingComment(false);
    }
  };

  const handleUploadAttachments = async () => {
    if (!selectedTask || attachmentFiles.length === 0) return;
    setUploadingAttachments(true);
    try {
      await tasksApi.uploadAttachments(selectedTask.id, attachmentFiles);
      setAttachmentFiles([]);
      setSelectedTask(await tasksApi.getTask(selectedTask.id));
      toast.success('Файлы загружены');
    } catch (error) {
      console.error('Ошибка загрузки вложений:', error);
      toast.error('Не удалось загрузить файлы');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleDownloadAttachment = async (attachment: NonNullable<EmployeeTask['attachments']>[number]) => {
    if (!selectedTask) return;
    try {
      await tasksApi.downloadAttachment(selectedTask.id, attachment);
    } catch (error) {
      console.error('Ошибка скачивания вложения:', error);
      toast.error('Не удалось скачать файл');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!selectedTask || !window.confirm('Удалить этот файл?')) return;
    try {
      await tasksApi.deleteAttachment(selectedTask.id, attachmentId);
      setSelectedTask(await tasksApi.getTask(selectedTask.id));
      toast.success('Файл удалён');
    } catch (error) {
      console.error('Ошибка удаления вложения:', error);
      toast.error('Не удалось удалить файл');
    }
  };

  const handleUploadEditAttachments = async () => {
    if (!editTaskId || editAttachmentFiles.length === 0) return;
    setUploadingEditAttachments(true);
    try {
      await tasksApi.uploadAttachments(editTaskId, editAttachmentFiles);
      const refreshed = await tasksApi.getTask(editTaskId);
      setEditAttachments(refreshed.attachments || []);
      setEditAttachmentFiles([]);
      toast.success('Файлы загружены');
    } catch (error) {
      console.error('Ошибка загрузки вложений:', error);
      toast.error('Не удалось загрузить файлы');
    } finally {
      setUploadingEditAttachments(false);
    }
  };

  const handleDeleteEditAttachment = async (attachmentId: number) => {
    if (!editTaskId || !window.confirm('Удалить этот файл?')) return;
    try {
      await tasksApi.deleteAttachment(editTaskId, attachmentId);
      setEditAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
      toast.success('Файл удалён');
    } catch (error) {
      console.error('Ошибка удаления вложения:', error);
      toast.error('Не удалось удалить файл');
    }
  };

  const runAction = async (
    task: EmployeeTask,
    action: EmployeeTaskAction,
    options: { keepDetailsOpen?: boolean } = {}
  ) => {
    setProcessingAction(action);
    try {
      let updated: EmployeeTask;
      if (action === 'start') updated = await tasksApi.startTask(task.id);
      else if (action === 'submit_review') updated = await tasksApi.submitForReview(task.id, actionComment.trim() || undefined);
      else if (action === 'approve') updated = await tasksApi.approveTask(task.id, actionComment.trim() || undefined);
      else if (action === 'return') updated = await tasksApi.returnTask(task.id, actionComment.trim());
      else updated = await tasksApi.cancelTask(task.id, actionComment.trim() || undefined);

      if (options.keepDetailsOpen || selectedTask?.id === task.id) {
        setSelectedTask(updated);
      }
      setActionComment('');
      toast.success('Задача обновлена');
      await loadTasks();
    } catch (error) {
      console.error('Ошибка действия по задаче:', error);
      toast.error('Не удалось обновить задачу');
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <Layout fullHeight>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <PageHeader
          icon={ListTodo}
          title="Задачи"
          description={isAdmin ? 'Поручения сотрудникам и контроль выполнения' : 'Назначенные вам поручения'}
          badge={<Badge variant="outline">{totalActiveTasks} активных</Badge>}
          actions={
            <div className="flex items-center gap-2">
              <IconButton icon={RefreshCw} title="Обновить" size="md" variant="ghost" onClick={loadTasks} />
              {isAdmin && (
                <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>
                  Создать
                </Button>
              )}
            </div>
          }
        />

        <div className="rounded-xl border border-border-subtle bg-brand-white shadow-sm overflow-hidden flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border-subtle bg-surface-muted px-4 py-3">
            {isAdmin && (
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Все' },
                  { value: 'assigned', label: 'Мои' },
                  { value: 'created', label: 'Поставленные мной' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => updateFilters({ scope: item.value as 'all' | 'assigned' | 'created' })}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-caption font-medium transition-colors',
                      filters.scope === item.value
                        ? 'border-brand-yellow bg-brand-yellow/15 text-brand-black'
                        : 'border-border-subtle bg-brand-white text-text-muted hover:text-brand-black'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Input
                leftIcon={Search}
                label="Поиск"
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder="Название или описание"
                className="xl:col-span-2"
              />

              <Select
                label="Статус"
                value={filters.status}
                onChange={(event) => updateFilters({ status: event.target.value as EmployeeTaskStatus | '' })}
              >
                <option value="">Все статусы</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label} ({stats[status.value] || 0})
                  </option>
                ))}
              </Select>

              <Select
                label="Приоритет"
                value={filters.priority}
                onChange={(event) => updateFilters({ priority: event.target.value as EmployeeTaskPriority | '' })}
              >
                <option value="">Все приоритеты</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </Select>

              {isAdmin && (
                <Select
                  label="Ответственный"
                  value={filters.assignedToUserId}
                  onChange={(event) =>
                    updateFilters({ assignedToUserId: event.target.value ? Number(event.target.value) : '' })
                  }
                  disabled={loadingUsers}
                  className="xl:col-span-2"
                >
                  <option value="">Все сотрудники</option>
                  {activeUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {getRoleLabel(item.role)}
                    </option>
                  ))}
                </Select>
              )}

              <label className="flex min-h-11 items-end gap-2 pb-2 text-body text-brand-black">
                <input
                  type="checkbox"
                  checked={filters.overdue}
                  onChange={(event) => updateFilters({ overdue: event.target.checked })}
                  className="h-4 w-4 rounded border-border-strong text-brand-yellow focus:ring-brand-yellow"
                />
                Просроченные
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Spinner size="lg" color="brand" />
                <p className="text-body text-text-muted">Загрузка задач...</p>
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="Задач нет"
                description="Задачи появятся здесь после назначения сотрудникам."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {tasks.map((task) => (
                  <article
                    key={task.id}
                    className={cn(
                      'rounded-xl border bg-brand-white p-4 shadow-sm transition-shadow hover:shadow-card-hover',
                      getDeadlineStyle(task)
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getStatusVariant(task.status)}>{getStatusLabel(task.status)}</Badge>
                          <Badge variant={getPriorityVariant(task.priority)}>{getPriorityLabel(task.priority)}</Badge>
                          {isOverdue(task) && <Badge variant="danger">Просрочена</Badge>}
                        </div>
                        <h2 className="mt-3 line-clamp-2 text-card-title text-brand-black">
                          {task.title}
                        </h2>
                        {task.description && (
                          <p className="mt-1 line-clamp-2 text-body text-text-muted">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <IconButton
                        icon={Eye}
                        title="Открыть"
                        size="md"
                        variant="ghost"
                        onClick={() => openTask(task.id)}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-caption lg:grid-cols-4">
                      <div className="rounded-lg bg-surface-inset px-3 py-2">
                        <span className="block text-text-muted">Поставил</span>
                        <span className="text-brand-black">{task.creator?.name || 'Не указано'}</span>
                      </div>
                      <div className="rounded-lg bg-surface-inset px-3 py-2">
                        <span className="block text-text-muted">Ответственные</span>
                        <span className="line-clamp-2 text-brand-black">
                          {(task.assignees || []).map((item) => item.name).join(', ') || task.assignee?.name || 'Не назначены'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-surface-inset px-3 py-2">
                        <span className="block text-text-muted">Создана</span>
                        <span className="text-brand-black">{formatDate(task.createdAt)}</span>
                      </div>
                      <div className="rounded-lg bg-surface-inset px-3 py-2">
                        <span className="block text-text-muted">Срок</span>
                        <span className={cn('text-brand-black', isOverdue(task) && 'text-danger-dark')}>
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Pencil}
                          onClick={() => openEditTask(task)}
                        >
                          Редактировать
                        </Button>
                      )}
                      {task.allowedActions.slice(0, 2).map((action) => {
                        const ActionIcon = ACTION_ICONS[action];
                        return (
                          <Button
                            key={action}
                            size="sm"
                            variant={ACTION_VARIANTS[action]}
                            leftIcon={ActionIcon}
                            onClick={() => {
                              if (action === 'return' || action === 'cancel') {
                                openTask(task.id);
                              } else {
                                runAction(task, action, { keepDetailsOpen: false });
                              }
                            }}
                            disabled={Boolean(processingAction)}
                          >
                            {ACTION_LABELS[action]}
                          </Button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={(page) => updateFilters({ page })}
          />
        </div>
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setPendingFiles([]);
        }}
        title="Создать задачу"
        size="lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Название"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Например: позвонить поставщику"
            required
          />
          <Textarea
            label="Описание"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Что нужно сделать и какой результат ожидается"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              label="Ответственный"
              value={form.assignedToUserId || ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, assignedToUserId: Number(event.target.value) }))
              }
              required
              disabled={loadingUsers}
              className="md:col-span-2"
            >
              <option value="">Выберите сотрудника</option>
              {activeUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {getRoleLabel(item.role)}
                </option>
              ))}
            </Select>
            <Select
              label="Приоритет"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: event.target.value as EmployeeTaskPriority }))
              }
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          </div>
          <CollaboratorPicker
            users={activeUsers}
            primaryUserId={Number(form.assignedToUserId)}
            value={form.collaboratorUserIds || []}
            onChange={(collaboratorUserIds) => setForm((current) => ({ ...current, collaboratorUserIds }))}
            disabled={loadingUsers}
          />
          <Input
            label="Дедлайн"
            type="date"
            value={form.dueDate || ''}
            onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            required
          />
          <div>
            <label className="mb-2 block text-body-medium text-brand-black" htmlFor="task-create-files">Файлы</label>
            <input
              id="task-create-files"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
              onChange={(event) => selectAttachmentFiles(Array.from(event.target.files || []), 0, setPendingFiles)}
              className="block w-full rounded-lg border border-border-subtle bg-brand-white px-3 py-2 text-body text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-body-medium file:text-brand-black"
            />
            <p className="mt-1 text-caption text-text-muted">До 10 файлов, каждый до 20 МБ.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
            <Button type="button" variant="secondary" onClick={() => {
              setCreateOpen(false);
              setPendingFiles([]);
            }}>
              Отмена
            </Button>
            <Button type="submit" loading={creating} disabled={!form.title.trim() || !form.assignedToUserId || !form.dueDate}>
              Создать задачу
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditAttachments([]);
          setEditAttachmentFiles([]);
        }}
        title="Редактировать задачу"
        size="lg"
      >
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <Input
            label="Название"
            value={editForm.title}
            onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
            required
          />
          <Textarea
            label="Описание"
            value={editForm.description}
            onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              label="Ответственный"
              value={editForm.assignedToUserId || ''}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, assignedToUserId: Number(event.target.value) }))
              }
              required
              disabled={loadingUsers}
              className="md:col-span-2"
            >
              <option value="">Выберите сотрудника</option>
              {activeUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {getRoleLabel(item.role)}
                </option>
              ))}
            </Select>
            <Select
              label="Приоритет"
              value={editForm.priority}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, priority: event.target.value as EmployeeTaskPriority }))
              }
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          </div>
          <CollaboratorPicker
            users={activeUsers}
            primaryUserId={Number(editForm.assignedToUserId)}
            value={editForm.collaboratorUserIds}
            onChange={(collaboratorUserIds) => setEditForm((current) => ({ ...current, collaboratorUserIds }))}
            disabled={loadingUsers}
          />
          <Input
            label="Дедлайн"
            type="date"
            value={editForm.dueDate || ''}
            onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))}
          />
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-text-muted" />
              <p className="text-body-medium text-brand-black">Вложения</p>
              <Badge variant="outline">{editAttachments.length}</Badge>
            </div>
            {loadingEditAttachments ? (
              <div className="flex h-16 items-center justify-center rounded-lg border border-border-subtle">
                <Spinner size="sm" color="brand" />
              </div>
            ) : (
              <div className="max-h-44 space-y-2 overflow-y-auto">
                {editAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-brand-white px-3 py-2">
                    <Paperclip className="h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-medium text-brand-black">{attachment.originalName}</p>
                      <p className="text-caption text-text-muted">{formatFileSize(attachment.size)}</p>
                    </div>
                    {isTaskImageAttachment(attachment) && (
                      <IconButton
                        icon={Eye}
                        title="Открыть изображение"
                        size="sm"
                        variant="ghost"
                        onClick={() => editTaskId && setAttachmentGallery({
                          taskId: editTaskId,
                          attachments: editAttachments,
                          initialAttachmentId: attachment.id,
                        })}
                      />
                    )}
                    <IconButton
                      icon={Download}
                      title="Скачать файл"
                      size="sm"
                      variant="ghost"
                      onClick={() => editTaskId && tasksApi.downloadAttachment(editTaskId, attachment).catch(() => {
                        toast.error('Не удалось скачать файл');
                      })}
                    />
                    <IconButton
                      icon={Trash2}
                      title="Удалить файл"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteEditAttachment(attachment.id)}
                    />
                  </div>
                ))}
                {editAttachments.length === 0 && (
                  <p className="text-body text-text-muted">Файлов пока нет.</p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-caption text-text-muted" htmlFor="task-edit-files">Добавить файлы</label>
                <input
                  id="task-edit-files"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
                  onChange={(event) => selectAttachmentFiles(
                    Array.from(event.target.files || []),
                    editAttachments.length,
                    setEditAttachmentFiles
                  )}
                  className="block w-full rounded-lg border border-border-subtle bg-brand-white px-3 py-2 text-body text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-body-medium"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                leftIcon={Paperclip}
                loading={uploadingEditAttachments}
                disabled={editAttachmentFiles.length === 0 || loadingEditAttachments}
                onClick={handleUploadEditAttachments}
              >
                Загрузить
              </Button>
            </div>
            <p className="mt-1 text-caption text-text-muted">До 10 файлов, каждый до 20 МБ.</p>
          </div>
          <Textarea
            label="Комментарий к изменению"
            value={editForm.comment}
            onChange={(event) => setEditForm((current) => ({ ...current, comment: event.target.value }))}
            placeholder="Например: переназначил на другого сотрудника"
            className="min-h-[88px]"
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
            <Button type="button" variant="secondary" onClick={() => {
              setEditOpen(false);
              setEditAttachments([]);
              setEditAttachmentFiles([]);
            }}>
              Отмена
            </Button>
            <Button type="submit" loading={editing} disabled={!editForm.title.trim() || !editForm.assignedToUserId}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedTask) || detailsLoading}
        onClose={() => {
          setSelectedTask(null);
          setAttachmentFiles([]);
        }}
        title="Задача"
        size="xl"
      >
        {detailsLoading && !selectedTask ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" color="brand" />
          </div>
        ) : selectedTask && (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusVariant(selectedTask.status)}>{getStatusLabel(selectedTask.status)}</Badge>
                <Badge variant={getPriorityVariant(selectedTask.priority)}>
                  {getPriorityLabel(selectedTask.priority)}
                </Badge>
                {isOverdue(selectedTask) && <Badge variant="danger">Просрочена</Badge>}
              </div>
              <h2 className="mt-3 text-section-title text-brand-black">{selectedTask.title}</h2>
              {selectedTask.description && (
                <p className="mt-2 whitespace-pre-wrap text-body text-text-muted">{selectedTask.description}</p>
              )}
              {isAdmin && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={Pencil}
                    onClick={() => openEditTask(selectedTask, { closeDetails: true })}
                  >
                    Редактировать
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-surface-inset px-3 py-2">
                <p className="text-caption text-text-muted">Поставил</p>
                <p className="text-body-medium text-brand-black">{selectedTask.creator?.name || 'Не указано'}</p>
              </div>
              <div className="rounded-lg bg-surface-inset px-3 py-2">
                <p className="text-caption text-text-muted">Ответственные</p>
                <p className="text-body-medium text-brand-black">
                  {(selectedTask.assignees || []).map((item) => item.name).join(', ') || selectedTask.assignee?.name || 'Не назначены'}
                </p>
              </div>
              <div className="rounded-lg bg-surface-inset px-3 py-2">
                <p className="text-caption text-text-muted">Создана</p>
                <p className="text-body-medium text-brand-black">{formatDateTime(selectedTask.createdAt)}</p>
              </div>
              <div className="rounded-lg bg-surface-inset px-3 py-2">
                <p className="text-caption text-text-muted">Срок</p>
                <p className={cn('text-body-medium text-brand-black', isOverdue(selectedTask) && 'text-danger-dark')}>
                  {formatDate(selectedTask.dueDate)}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-text-muted" />
                <h3 className="text-card-title text-brand-black">Вложения</h3>
                <Badge variant="outline">{selectedTask.attachments?.length || 0}</Badge>
              </div>
              <div className="space-y-2">
                {(selectedTask.attachments || []).map((attachment) => {
                  const canDelete = isAdmin || Number(attachment.uploadedByUserId) === Number(user?.id);
                  return (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-brand-white px-3 py-2">
                      <Paperclip className="h-4 w-4 shrink-0 text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-medium text-brand-black">{attachment.originalName}</p>
                        <p className="text-caption text-text-muted">
                          {formatFileSize(attachment.size)} · {attachment.uploader?.name || 'Сотрудник'} · {formatDateTime(attachment.createdAt)}
                        </p>
                      </div>
                      {isTaskImageAttachment(attachment) && (
                        <IconButton
                          icon={Eye}
                          title="Открыть изображение"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAttachmentGallery({
                            taskId: selectedTask.id,
                            attachments: selectedTask.attachments || [],
                            initialAttachmentId: attachment.id,
                          })}
                        />
                      )}
                      <IconButton
                        icon={Download}
                        title="Скачать файл"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadAttachment(attachment)}
                      />
                      {canDelete && (
                        <IconButton
                          icon={Trash2}
                          title="Удалить файл"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                        />
                      )}
                    </div>
                  );
                })}
                {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                  <p className="text-body text-text-muted">Файлов пока нет.</p>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-caption text-text-muted" htmlFor="task-detail-files">Добавить файлы</label>
                  <input
                    id="task-detail-files"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={(event) => selectAttachmentFiles(
                      Array.from(event.target.files || []),
                      selectedTask.attachments?.length || 0,
                      setAttachmentFiles
                    )}
                    className="block w-full rounded-lg border border-border-subtle bg-brand-white px-3 py-2 text-body text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-body-medium"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  leftIcon={Paperclip}
                  loading={uploadingAttachments}
                  disabled={attachmentFiles.length === 0}
                  onClick={handleUploadAttachments}
                >
                  Загрузить
                </Button>
              </div>
              <p className="mt-1 text-caption text-text-muted">До 10 файлов, каждый до 20 МБ.</p>
            </div>

            {selectedTask.allowedActions.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-surface-muted p-4">
                <Textarea
                  label="Комментарий"
                  value={actionComment}
                  onChange={(event) => setActionComment(event.target.value)}
                  placeholder="Комментарий нужен при возврате, для остальных действий необязателен"
                  className="min-h-[88px]"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTask.allowedActions.map((action) => {
                    const ActionIcon = ACTION_ICONS[action];
                    const returnWithoutComment = action === 'return' && actionComment.trim().length < 2;
                    return (
                      <Button
                        key={action}
                        variant={ACTION_VARIANTS[action]}
                        leftIcon={ActionIcon}
                        loading={processingAction === action}
                        disabled={Boolean(processingAction) || returnWithoutComment}
                        onClick={() => runAction(selectedTask, action, { keepDetailsOpen: true })}
                      >
                        {ACTION_LABELS[action]}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-text-muted" />
                <h3 className="text-card-title text-brand-black">Обсуждение</h3>
              </div>
              <div className="space-y-2">
                {(selectedTask.comments || []).map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-border-subtle bg-brand-white px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-medium text-brand-black">{comment.author?.name || 'Сотрудник'}</p>
                      <p className="text-caption text-text-muted">{formatDateTime(comment.createdAt)}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-body text-text-muted">{comment.comment}</p>
                  </div>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <p className="text-body text-text-muted">Комментариев пока нет.</p>
                )}
              </div>
              <form onSubmit={handleAddComment} className="mt-3 space-y-3">
                <Textarea
                  label="Новый комментарий"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Добавьте уточнение, результат или вопрос по задаче"
                  className="min-h-[88px]"
                />
                <div className="flex justify-end">
                  <Button type="submit" loading={addingComment} disabled={!commentText.trim()}>
                    Добавить комментарий
                  </Button>
                </div>
              </form>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                <h3 className="text-card-title text-brand-black">История</h3>
              </div>
              <div className="space-y-2">
                {(selectedTask.history || []).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border-subtle bg-brand-white px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-medium text-brand-black">
                        {entry.actor?.name || 'Система'} · {getHistoryActionLabel(entry.action)}
                      </p>
                      <p className="text-caption text-text-muted">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    {(entry.fromStatus || entry.toStatus) && (
                      <p className="mt-1 text-caption text-text-muted">
                        {entry.fromStatus ? getStatusLabel(entry.fromStatus) : 'Старт'} →{' '}
                        {entry.toStatus ? getStatusLabel(entry.toStatus) : 'Без статуса'}
                      </p>
                    )}
                    {entry.comment && (
                      <p className="mt-2 whitespace-pre-wrap text-body text-text-muted">{entry.comment}</p>
                    )}
                  </div>
                ))}
                {(!selectedTask.history || selectedTask.history.length === 0) && (
                  <p className="text-body text-text-muted">История пока пустая.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {attachmentGallery && (
        <TaskAttachmentGallery
          taskId={attachmentGallery.taskId}
          attachments={attachmentGallery.attachments}
          initialAttachmentId={attachmentGallery.initialAttachmentId}
          onClose={() => setAttachmentGallery(null)}
        />
      )}
    </Layout>
  );
};
