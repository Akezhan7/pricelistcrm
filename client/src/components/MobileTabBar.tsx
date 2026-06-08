import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, Package, Truck, Menu } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { cn } from '../utils/cn';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  path: string;
  match?: (pathname: string) => boolean;
}

const MAIN_TABS: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Главная',
    icon: Home,
    path: '/dashboard',
    match: (p) => p === '/dashboard',
  },
  {
    id: 'orders',
    label: 'Заявки',
    icon: FileText,
    path: '/orders',
    match: (p) => p === '/orders' || p.startsWith('/orders/'),
  },
  {
    id: 'products',
    label: 'Товары',
    icon: Package,
    path: '/products',
    match: (p) => p === '/products',
  },
  {
    id: 'suppliers',
    label: 'Поставщики',
    icon: Truck,
    path: '/suppliers',
    match: (p) => p === '/suppliers' || p.startsWith('/suppliers/'),
  },
];

const HIDDEN_ROUTES = ['/login', '/register'];

function shouldHideTabBar(pathname: string): boolean {
  if (HIDDEN_ROUTES.includes(pathname)) return true;
  if (/^\/orders\/[^/]+/.test(pathname)) return true;
  if (/^\/suppliers\/[^/]+/.test(pathname)) return true;
  return false;
}

function isMoreTabActive(pathname: string): boolean {
  return !MAIN_TABS.some((tab) => tab.match?.(pathname) ?? pathname === tab.path);
}

export const MobileTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, openMobileMenu } = useUI();

  if (!isMobile || shouldHideTabBar(location.pathname)) {
    return null;
  }

  const moreActive = isMoreTabActive(location.pathname);

  return (
    <nav
      className={cn(
        'md:hidden fixed inset-x-0 bottom-0 z-30',
        'bg-brand-white/95 backdrop-blur-md border-t border-border-subtle',
        'pb-safe pt-1'
      )}
      aria-label="Основная навигация"
    >
      <div className="flex items-stretch justify-around h-14 max-w-lg mx-auto">
        {MAIN_TABS.map(({ id, label, icon: Icon, path, match }) => {
          const active = match ? match(location.pathname) : location.pathname === path;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-11 min-w-11 px-1',
                'transition-colors duration-200 active:scale-[0.97]',
                active ? 'text-brand-black' : 'text-text-muted hover:text-brand-black'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn('h-5 w-5', active && 'text-brand-yellow-dark')}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className={cn('text-[10px] font-medium leading-none', active && 'font-semibold')}>
                {label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={openMobileMenu}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-11 min-w-11 px-1',
            'transition-colors duration-200 active:scale-[0.97]',
            moreActive ? 'text-brand-black' : 'text-text-muted hover:text-brand-black'
          )}
          aria-label="Ещё — открыть меню"
        >
          <Menu
            className={cn('h-5 w-5', moreActive && 'text-brand-yellow-dark')}
            strokeWidth={moreActive ? 2.25 : 1.75}
          />
          <span className={cn('text-[10px] font-medium leading-none', moreActive && 'font-semibold')}>
            Ещё
          </span>
        </button>
      </div>
    </nav>
  );
};
