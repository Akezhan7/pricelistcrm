import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';
import {
  Home,
  Package,
  Truck,
  FileText,
  Map,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Search,
  FolderTree,
  Warehouse,
  ClipboardList,
  ListChecks,
  PackageCheck,
  Tag,
  X,
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

const navButtonClass = (active: boolean, collapsed: boolean) =>
  cn(
    'w-full flex items-center rounded-lg transition-colors duration-200',
    collapsed ? 'justify-center h-12 w-12 mx-auto' : 'h-12 px-3 gap-3',
    active
      ? collapsed
        ? 'bg-brand-yellow text-brand-black shadow-sm'
        : 'bg-brand-yellow/10 text-brand-black font-semibold border-l-[3px] border-brand-yellow pl-[calc(0.75rem-3px)]'
      : collapsed
        ? 'text-gray-500 hover:bg-gray-100 hover:text-brand-black'
        : 'text-gray-700 hover:bg-gray-50 hover:text-brand-black border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]'
  );

export const Sidebar: React.FC<SidebarProps> = ({ searchQuery, onSearchChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isSidebarCollapsed: isCollapsed,
    toggleSidebar,
    isMobile,
    isMobileMenuOpen,
    closeMobileMenu,
  } = useUI();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const showCollapsed = !isMobile && isCollapsed;

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Главная',
      icon: <Home className="w-5 h-5 flex-shrink-0" />,
      path: '/dashboard',
    },
    {
      id: 'orders',
      label: 'Заявки',
      icon: <FileText className="w-5 h-5 flex-shrink-0" />,
      path: '/orders',
    },
    {
      id: 'products',
      label: 'Товары',
      icon: <Package className="w-5 h-5 flex-shrink-0" />,
      path: '/products',
    },
    {
      id: 'workflow',
      label: 'Очередь',
      icon: <ListChecks className="w-5 h-5 flex-shrink-0" />,
      path: '/workflow',
      requiredRole: [
        'admin',
        'designer',
        'marketplace_manager',
        'purchase_manager',
        'warehouse_operator',
        'accountant',
      ],
    },
    {
      id: 'suppliers',
      label: 'Поставщики',
      icon: <Truck className="w-5 h-5 flex-shrink-0" />,
      path: '/suppliers',
    },
    {
      id: 'price-list',
      label: 'Прайс',
      icon: <Tag className="w-5 h-5 flex-shrink-0" />,
      path: '/price-list',
    },
    {
      id: 'stock',
      label: 'Остатки на складе',
      icon: <Warehouse className="w-5 h-5 flex-shrink-0" />,
      path: '/stock',
    },
    {
      id: 'categories',
      label: 'Категории',
      icon: <FolderTree className="w-5 h-5 flex-shrink-0" />,
      path: '/categories',
    },
    {
      id: 'collector-tasks',
      label: 'Задания сборщиков',
      icon: <ClipboardList className="w-5 h-5 flex-shrink-0" />,
      path: '/collector/tasks',
      requiredRole: ['admin', 'collector', 'purchase_manager'],
    },
    {
      id: 'warehouse-receipt',
      label: 'Приёмка товара',
      icon: <PackageCheck className="w-5 h-5 flex-shrink-0" />,
      path: '/warehouse/receipt',
      requiredRole: ['admin', 'warehouse_operator', 'purchase_manager'],
    },
    {
      id: 'map',
      label: 'Карта Plastkrep',
      icon: <Map className="w-5 h-5 flex-shrink-0" />,
      path: '/map',
    },
  ];

  const adminMenuItems: MenuItem[] = [
    {
      id: 'users',
      label: 'Пользователи',
      icon: <Users className="w-5 h-5 flex-shrink-0" />,
      path: '/users',
      requiredRole: ['admin'],
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      closeMobileMenu();
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
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

  const filteredMenuItems = menuItems.filter(
    (item) => !item.requiredRole || item.requiredRole.includes(user?.role || '')
  );

  const renderNavItem = (item: MenuItem) => (
    <li key={item.id}>
      <button
        type="button"
        onClick={() => handleNavigate(item.path)}
        className={navButtonClass(isActivePath(item.path), showCollapsed)}
        title={showCollapsed ? item.label : undefined}
      >
        {item.icon}
        {!showCollapsed && (
          <>
            <span className="flex-1 text-left text-sm">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    </li>
  );

  return (
    <>
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] md:hidden transition-opacity duration-300"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-brand-white text-brand-black',
          'border-r border-border shadow-sm',
          'transition-[width,transform] duration-300 flex flex-col',
          isMobile
            ? `w-[min(300px,85vw)] z-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `z-40 ${showCollapsed ? 'w-20' : 'w-64'}`
        )}
        aria-hidden={isMobile && !isMobileMenuOpen}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center border-b border-border flex-shrink-0',
            showCollapsed ? 'justify-center px-3 py-5' : 'justify-between px-5 py-5',
            isMobile && 'px-4'
          )}
        >
          {showCollapsed ? (
            <div
              className="h-10 w-10 bg-brand-black rounded-lg flex items-center justify-center"
              title="Plastkrep CRM"
            >
              <span className="text-brand-yellow font-bold text-lg leading-none">B</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-1 bg-brand-yellow rounded-full flex-shrink-0" aria-hidden />
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-brand-black leading-tight">
                  Plastkrep <span className="text-gray-400 font-semibold">CRM</span>
                </h1>
              </div>
            </div>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={closeMobileMenu}
              className="flex items-center justify-center h-11 w-11 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-black transition-colors duration-200 flex-shrink-0"
              aria-label="Закрыть меню"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search */}
        {!showCollapsed && onSearchChange && (
          <div className="hidden md:block px-4 pt-4 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Поиск..."
                className="pl-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {!showCollapsed && (
            <p className="px-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Навигация
            </p>
          )}
          <ul className={cn('space-y-0.5', showCollapsed ? 'px-2' : 'px-3')}>
            {filteredMenuItems.map(renderNavItem)}
          </ul>

          {user?.role === 'admin' && (
            <>
              <div className={cn('my-3 border-t border-border', showCollapsed ? 'mx-3' : 'mx-5')} />
              {!showCollapsed && (
                <p className="px-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Администрирование
                </p>
              )}
              <ul className={cn('space-y-0.5', showCollapsed ? 'px-2' : 'px-3')}>
                {adminMenuItems.map(renderNavItem)}
              </ul>
            </>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'w-full flex items-center rounded-lg hover:bg-gray-50 transition-colors duration-200',
                showCollapsed ? 'justify-center h-12' : 'gap-3 px-3 h-12'
              )}
              title={showCollapsed ? user?.name : undefined}
            >
              <div className="h-9 w-9 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-brand-yellow/30">
                <User className="h-4 w-4 text-brand-black" />
              </div>
              {!showCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-brand-black truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{getRoleLabel(user?.role)}</p>
                </div>
              )}
            </button>

            {showUserMenu && !showCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-brand-white rounded-card shadow-modal border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    if (isMobile) {
                      closeMobileMenu();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-11 hover:bg-danger-light transition-colors duration-200 text-left text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Выйти</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3.5 top-[4.5rem] h-7 w-7 bg-brand-white border border-border rounded-full shadow-card hover:bg-gray-50 transition-colors duration-200 items-center justify-center"
          aria-label={showCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {showCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
          )}
        </button>
      </aside>

      {showUserMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
      )}
    </>
  );
};
