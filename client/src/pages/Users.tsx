import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Pencil, Plus, Trash2, UserCheck, Users as UsersIcon } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormFooter,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import type { BadgeVariant } from '../components/ui/Badge';
import { USER_ROLE_LABELS, USER_ROLE_VALUES, type UserRole } from '../constants/userRoles';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  canManageUsers?: boolean;
  createdAt: string;
}

const ROLE_BADGES: Record<UserRole, BadgeVariant> = {
  admin: 'danger',
  designer: 'success',
  marketplace_manager: 'info',
  purchase_manager: 'info',
  warehouse_operator: 'success',
  collector: 'warning',
  driver: 'outline',
  operator: 'default',
  accountant: 'info',
};

const ROLES = USER_ROLE_VALUES.map((value) => ({
  value,
  label: USER_ROLE_LABELS[value],
  badge: ROLE_BADGES[value],
}));

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'collector',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      try {
        const response = await api.get('/auth/users/manage');
        setUsers(response.data.data.users || []);
        setCanManageUsers(true);
      } catch (manageError: unknown) {
        const status = (manageError as { response?: { status?: number } })?.response?.status;
        if (status !== 403) throw manageError;

        const response = await api.get('/auth/users');
        setUsers(response.data.data.users || []);
        setCanManageUsers(false);
      }
    } catch (error: unknown) {
      console.error('Ошибка загрузки пользователей:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'collector',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (selectedUser: User) => {
    setEditingUser(selectedUser);
    setFormData({
      name: selectedUser.name,
      email: selectedUser.email,
      password: '',
      role: selectedUser.role,
      isActive: selectedUser.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      toast.warning('Заполните все обязательные поля');
      return;
    }

    try {
      setSubmitting(true);

      if (editingUser) {
        await api.patch(`/auth/users/${editingUser.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {}),
        });
        toast.success('Пользователь успешно обновлён');
        setShowModal(false);
        await loadUsers();
      } else {
        await api.post('/auth/users', formData);
        toast.success('Пользователь успешно создан');
        setShowModal(false);
        loadUsers();
      }
    } catch (error: unknown) {
      console.error('Ошибка:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Ошибка при сохранении пользователя');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/auth/users/${userToDelete.id}`);
      toast.success('Учётная запись удалена');
      setUserToDelete(null);
      await loadUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Не удалось удалить пользователя');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find((r) => r.value === role) || { label: role, badge: 'default' as BadgeVariant };
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
          title="Управление пользователями"
          description={canManageUsers
            ? 'Создание, редактирование и управление доступом'
            : 'Создание учётных записей и назначение ролей'}
          icon={UsersIcon}
          actions={
            <Button variant="primary" leftIcon={Plus} onClick={handleCreate}>
              Создать пользователя
            </Button>
          }
        />

        <Card>
          <div className="space-y-3 p-4 md:hidden">
            {users.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title="Пользователи не найдены"
                action={
                  <Button variant="primary" leftIcon={Plus} onClick={handleCreate}>
                    Создать пользователя
                  </Button>
                }
              />
            ) : (
              users.map((user) => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <div
                    key={user.id}
                    className="rounded-xl border border-border-subtle bg-brand-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-inset">
                        <UserCheck className="h-5 w-5 text-text-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-medium text-brand-black">{user.name}</p>
                        <p className="truncate text-caption text-text-muted">{user.email}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={roleInfo.badge}>{roleInfo.label}</Badge>
                        {canManageUsers && (
                          <Badge variant={user.isActive ? 'success' : 'outline'}>
                            {user.isActive ? 'Активен' : 'Отключён'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                      <p className="text-caption tabular-nums text-text-muted">
                        Создан: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      {canManageUsers && (
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={Pencil}
                            size="sm"
                            title="Редактировать пользователя"
                            onClick={() => handleEdit(user)}
                          />
                          <IconButton
                            icon={Trash2}
                            size="sm"
                            variant="danger"
                            title={Number(currentUser?.id) === user.id
                              ? 'Нельзя удалить текущую учётную запись'
                              : 'Удалить пользователя'}
                            disabled={Number(currentUser?.id) === user.id}
                            onClick={() => setUserToDelete(user)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Table className="hidden md:table">
            <TableHead sticky>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Имя</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Роль</TableHeaderCell>
                {canManageUsers && <TableHeaderCell>Статус</TableHeaderCell>}
                <TableHeaderCell>Дата создания</TableHeaderCell>
                {canManageUsers && <TableHeaderCell className="w-24">Действия</TableHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={canManageUsers ? 6 : 4} className="py-12">
                    <EmptyState
                      icon={UsersIcon}
                      title="Пользователи не найдены"
                      action={
                        <Button variant="primary" leftIcon={Plus} onClick={handleCreate}>
                          Создать пользователя
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-inset">
                            <UserCheck className="h-5 w-5 text-brand-yellow" />
                          </div>
                          <div className="text-body-medium text-brand-black">{user.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-body text-brand-black">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleInfo.badge}>{roleInfo.label}</Badge>
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <Badge variant={user.isActive ? 'success' : 'outline'}>
                            {user.isActive ? 'Активен' : 'Отключён'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-caption text-text-muted tabular-nums">
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IconButton
                              icon={Pencil}
                              size="sm"
                              title="Редактировать пользователя"
                              onClick={() => handleEdit(user)}
                            />
                            <IconButton
                              icon={Trash2}
                              size="sm"
                              variant="danger"
                              title={Number(currentUser?.id) === user.id
                                ? 'Нельзя удалить текущую учётную запись'
                                : 'Удалить пользователя'}
                              disabled={Number(currentUser?.id) === user.id}
                              onClick={() => setUserToDelete(user)}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <Alert variant="info" icon={UsersIcon} title="Роли пользователей:">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Администратор</strong> — полный доступ ко всем функциям
            </li>
            <li>
              <strong>Менеджер по закупкам</strong> — создание заявок, управление поставщиками
            </li>
            <li>
              <strong>Сборщик</strong> — просмотр заданий на сбор товара
            </li>
            <li>
              <strong>Оператор склада</strong> — приёмка товара на склад
            </li>
            <li>
              <strong>Водитель</strong> — доставка товара
            </li>
            <li>
              <strong>Бухгалтер</strong> — работа с оплатами
            </li>
          </ul>
        </Alert>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        size="md"
        footer={
          <FormFooter
            onCancel={() => setShowModal(false)}
            submitLabel={submitting ? 'Сохранение...' : editingUser ? 'Сохранить' : 'Создать'}
            submitLoading={submitting}
            submitDisabled={submitting}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            submitType="button"
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Имя"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Иван Иванов"
          />

          <Input
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="ivan@example.com"
          />

          <Input
            label={editingUser ? 'Новый пароль' : 'Пароль'}
            type="password"
            required={!editingUser}
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={editingUser ? 'Оставьте пустым, чтобы не менять' : 'Минимум 6 символов'}
            helperText={editingUser
              ? 'Заполняйте только для смены пароля'
              : 'Пользователь сможет изменить пароль после входа'}
          />

          <Select
            label="Роль"
            required
            value={formData.role}
            disabled={Boolean(editingUser && Number(currentUser?.id) === editingUser.id)}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>

          {editingUser && (
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle px-3 py-3">
              <span>
                <span className="block text-body-medium text-brand-black">Активный пользователь</span>
                <span className="block text-caption text-text-muted">
                  Отключённый пользователь не сможет войти в CRM
                </span>
              </span>
              <input
                type="checkbox"
                checked={formData.isActive}
                disabled={Number(currentUser?.id) === editingUser.id}
                onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                className="h-5 w-5 rounded border-border-input text-brand-yellow focus:ring-brand-yellow/30"
              />
            </label>
          )}
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Удалить пользователя"
        message="Учётная запись будет удалена навсегда. Если пользователь связан с рабочими документами, CRM не позволит удалить его."
        itemName={userToDelete ? `${userToDelete.name} · ${userToDelete.email}` : undefined}
      />
    </Layout>
  );
};
