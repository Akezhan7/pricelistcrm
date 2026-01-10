import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Package,
  Truck,
  FileText,
  Map,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Search,
  FolderTree,
  Warehouse,
  ClipboardList,
  PackageCheck
} from 'lucide-react';

interface SidebarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  requiredRole?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ searchQuery, onSearchChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Меню навигации
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Главная',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard',
    },
    {
      id: 'orders',
      label: 'Заявки',
      icon: <FileText className="w-5 h-5" />,
      path: '/orders',
    },
    {
      id: 'stock',
      label: 'Остатки на складе',
      icon: <Warehouse className="w-5 h-5" />,
      path: '/stock',
    },
    {
      id: 'categories',
      label: 'Категории',
      icon: <FolderTree className="w-5 h-5" />,
      path: '/categories',
    },
    {
      id: 'collector-tasks',
      label: 'Задания сборщиков',
      icon: <ClipboardList className="w-5 h-5" />,
      path: '/collector/tasks',
      requiredRole: ['admin', 'collector', 'purchase_manager'],
    },
    {
      id: 'warehouse-receipt',
      label: 'Приёмка товара',
      icon: <PackageCheck className="w-5 h-5" />,
      path: '/warehouse/receipt',
      requiredRole: ['admin', 'warehouse_operator', 'purchase_manager'],
    },
    {
      id: 'products',
      label: 'Товары',
      icon: <Package className="w-5 h-5" />,
      path: '/dashboard', // На главной странице есть товары
    },
    {
      id: 'suppliers',
      label: 'Поставщики',
      icon: <Truck className="w-5 h-5" />,
      path: '/dashboard', // На главной странице есть поставщики
    },
    {
      id: 'map',
      label: 'Карта Bayside',
      icon: <Map className="w-5 h-5" />,
      path: '/map',
    },
  ];

  // Админ меню
  const adminMenuItems: MenuItem[] = [
    {
      id: 'users',
      label: 'Пользователи',
      icon: <Users className="w-5 h-5" />,
      path: '/users',
      requiredRole: ['admin'],
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: <Settings className="w-5 h-5" />,
      path: '/settings',
      requiredRole: ['admin'],
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const getRoleLabel = (role?: string) => {
    const roles: Record<string, string> = {
      admin: 'Администратор',
      operator: 'Оператор',
      purchase_manager: 'Менеджер по закупкам',
      accountant: 'Бухгалтер',
      warehouse_operator: 'Оператор склада',
      collector: 'Сборщик',
      driver: 'Водитель',
    };
    return roles[role || ''] || 'Пользователь';
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-40 flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Логотип и название */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">CRM</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Bayside CRM</h1>
                <p className="text-xs text-gray-400">Управление товарами</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">C</span>
            </div>
          )}
        </div>

        {/* Поиск */}
        {!isCollapsed && onSearchChange && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Основное меню */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems
              .filter(item => !item.requiredRole || item.requiredRole.includes(user?.role || ''))
              .map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.path)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
                    ${
                      isActivePath(item.path)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Разделитель */}
          {user?.role === 'admin' && (
            <>
              <div className="my-4 mx-6 border-t border-gray-800"></div>

              {/* Админ меню */}
              <ul className="space-y-1 px-3">
                {adminMenuItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`
                        w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
                        ${
                          isActivePath(item.path)
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                      `}
                      title={isCollapsed ? item.label : ''}
                    >
                      {item.icon}
                      {!isCollapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Информация о пользователе */}
        <div className="border-t border-gray-800 p-4">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{getRoleLabel(user?.role)}</p>
                </div>
              )}
            </button>

            {/* Меню пользователя */}
            {showUserMenu && !isCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm">Профиль</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-600 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Выйти</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Кнопка сворачивания */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-gray-900 border-2 border-gray-700 rounded-full p-1 hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </aside>

      {/* Overlay для закрытия меню пользователя */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};
