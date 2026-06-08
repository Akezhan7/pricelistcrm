import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Users as UsersIcon, Plus, UserCheck } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormFooter,
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

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES: { value: string; label: string; badge: BadgeVariant }[] = [
  { value: 'admin', label: 'Администратор', badge: 'danger' },
  { value: 'purchase_manager', label: 'Менеджер по закупкам', badge: 'info' },
  { value: 'warehouse_operator', label: 'Оператор склада', badge: 'success' },
  { value: 'collector', label: 'Сборщик', badge: 'warning' },
  { value: 'driver', label: 'Водитель', badge: 'outline' },
  { value: 'operator', label: 'Оператор', badge: 'default' },
  { value: 'accountant', label: 'Бухгалтер', badge: 'info' },
];

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'collector',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      setUsers(response.data.data.users || []);
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
        toast.info('Редактирование пользователей пока не реализовано');
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
          description="Создание учётных записей и назначение ролей"
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
                      <Badge variant={roleInfo.badge}>{roleInfo.label}</Badge>
                    </div>
                    <p className="mt-3 border-t border-border-subtle pt-3 text-caption tabular-nums text-text-muted">
                      Создан: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </p>
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
                <TableHeaderCell>Дата создания</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-12">
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
                      <TableCell className="text-caption text-text-muted tabular-nums">
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
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

          {!editingUser && (
            <Input
              label="Пароль"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Минимум 6 символов"
              helperText="Пользователь сможет изменить пароль после входа"
            />
          )}

          <Select
            label="Роль"
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </form>
      </Modal>
    </Layout>
  );
};
