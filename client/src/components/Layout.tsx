import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { OrderDraftBanner } from './OrderDraftBanner';
import { useUI } from '../context/UIContext';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  fullHeight?: boolean;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Главная',
  '/orders': 'Заявки',
  '/products': 'Товары',
  '/workflow': 'Очередь',
  '/suppliers': 'Поставщики',
  '/price-list': 'Прайс',
  '/stock': 'Остатки на складе',
  '/categories': 'Категории',
  '/collector/tasks': 'Задания сборщиков',
  '/warehouse/receipt': 'Приёмка товара',
  '/map': 'Карта Plastkrep',
  '/users': 'Пользователи',
};

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  if (pathname.startsWith('/orders/')) return 'Заявка';
  if (pathname.startsWith('/suppliers/')) return 'Поставщик';

  const segment = pathname.split('/').filter(Boolean).pop();
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Plastkrep CRM';
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  searchQuery,
  onSearchChange,
  fullHeight = false,
}) => {
  const { isSidebarCollapsed, isMobile, toggleMobileMenu } = useUI();
  const location = useLocation();

  const pageTitle = useMemo(() => resolvePageTitle(location.pathname), [location.pathname]);

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      <Sidebar searchQuery={searchQuery} onSearchChange={onSearchChange} />

      <main
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-[margin] duration-300 min-w-0',
          !isMobile && (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64')
        )}
      >
        <header className="md:hidden flex-shrink-0 flex items-center gap-2 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] bg-brand-white border-b border-border shadow-sm z-30">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="flex items-center justify-center h-12 w-12 -ml-1 rounded-xl text-brand-black hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200"
            aria-label="Открыть меню"
          >
            <Menu className="h-7 w-7" strokeWidth={1.75} />
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none">
              Plastkrep CRM
            </span>
            <h1 className="text-base font-bold text-brand-black truncate leading-tight mt-0.5">
              {pageTitle}
            </h1>
          </div>
          <div className="h-9 w-9 flex-shrink-0" aria-hidden="true" />
        </header>

        <OrderDraftBanner />

        {fullHeight ? (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto md:overflow-hidden max-md:pb-tab-bar">
            <div className="min-h-full md:h-full max-w-[1600px] mx-auto w-full">{children}</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-y-contain">
            <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full max-md:pb-tab-bar">{children}</div>
          </div>
        )}
      </main>

      <MobileTabBar />
    </div>
  );
};
