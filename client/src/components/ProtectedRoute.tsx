import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireRole?: 'admin' | 'operator';
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
}) => {
  const { user, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <Spinner size="lg" color="brand" useLucide />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="max-w-md w-full bg-brand-white rounded-card shadow-card border border-border p-6 text-center">
          <div className="text-danger text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-brand-black mb-2">Доступ запрещен</h2>
          <p className="text-text-muted mb-4">
            У вас недостаточно прав для просмотра этой страницы.
          </p>
          <p className="text-sm text-text-muted">
            Требуется роль:{' '}
            <span className="font-medium">
              {requireRole === 'admin' ? 'Администратор' : 'Оператор'}
            </span>
          </p>
          <p className="text-sm text-text-muted">
            Ваша роль:{' '}
            <span className="font-medium">
              {user.role === 'admin' ? 'Администратор' : 'Оператор'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
