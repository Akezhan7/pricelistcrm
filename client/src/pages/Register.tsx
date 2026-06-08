import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserPlus } from 'lucide-react';
import { Alert, Button, Input } from '../components/ui';
import { AuthLayout } from '../components/AuthLayout';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setValidationError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Ошибка регистрации';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Регистрация"
      subtitle="Создайте новый аккаунт для работы с системой"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {validationError && <Alert variant="error">{validationError}</Alert>}

        <Input
          id="name"
          name="name"
          type="text"
          label="Полное имя"
          autoComplete="name"
          required
          placeholder="Иван Петров"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          id="email"
          name="email"
          type="email"
          label="Email адрес"
          autoComplete="email"
          required
          placeholder="ivan@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Пароль"
          autoComplete="new-password"
          required
          placeholder="Минимум 6 символов"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Подтверждение пароля"
          autoComplete="new-password"
          required
          placeholder="Повторите пароль"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          leftIcon={UserPlus}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>

        <p className="text-center text-body text-text-muted">
          Уже есть аккаунт?{' '}
          <Link
            to="/login"
            className="font-medium text-accent hover:text-accent-hover transition-colors duration-200"
          >
            Войти в систему
          </Link>
        </p>

        <Alert variant="info" icon={false}>
          <strong>Примечание:</strong> Новые пользователи создаются с ролью «Оператор».
          Права администратора может назначить только существующий администратор.
        </Alert>
      </form>
    </AuthLayout>
  );
};
