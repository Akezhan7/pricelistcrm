import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, RefreshCw, LogOut, User, Map, Settings, FileText } from 'lucide-react';

type HeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onOpenMap?: () => void;
};

export const Header: React.FC<HeaderProps> = ({ 
  searchQuery, 
  onSearchChange, 
  onRefresh,
  onOpenMap
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4">
      <div className="flex items-center space-x-4">
        {/* Логотип/название */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">CRM</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Управление товарами
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center max-w-md mx-8">
        {/* Поиск */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск товаров по названию или артикулу..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Кнопка обновления */}
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить данные"
        >
          <RefreshCw className="h-5 w-5" />
        </button>

        {/* Навигация */}
        <nav className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" 
            title="Заявки"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">Заявки</span>
          </button>
          <button 
            onClick={onOpenMap}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors" 
            title="Карта Bayside"
          >
            <Map className="h-5 w-5" />
          </button>
          {user?.role === 'admin' && (
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="Настройки">
              <Settings className="h-5 w-5" />
            </button>
          )}
        </nav>

        {/* Информация о пользователе */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">
              {user?.role === 'admin' ? 'Администратор' : 'Оператор'}
            </p>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
        </div>

        {/* Кнопка выхода */}
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Выйти из системы"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
