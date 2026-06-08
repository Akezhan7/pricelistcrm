import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { AuthLayout } from '../components/AuthLayout';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Ошибка входа в систему';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Вход в систему"
      subtitle="CRM система управления товарами и поставщиками"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email адрес"
          autoComplete="email"
          required
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Пароль"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          leftIcon={LogIn}
        >
          {loading ? 'Вход...' : 'Войти в систему'}
        </Button>

        <p className="text-center text-body text-text-muted">
          Нет аккаунта?{' '}
          <Link
            to="/register"
            className="font-medium text-accent hover:text-accent-hover transition-colors duration-200"
          >
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};
