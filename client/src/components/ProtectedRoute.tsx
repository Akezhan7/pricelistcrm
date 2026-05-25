import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireRole?: 'admin' | 'operator';
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireRole 
}) => {
  const { user, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600 mb-4">
            У вас недостаточно прав для просмотра этой страницы.
          </p>
          <p className="text-sm text-gray-500">
            Требуется роль: <span className="font-medium">{requireRole === 'admin' ? 'Администратор' : 'Оператор'}</span>
          </p>
          <p className="text-sm text-gray-500">
            Ваша роль: <span className="font-medium">{user.role === 'admin' ? 'Администратор' : 'Оператор'}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
