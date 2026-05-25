import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface UIContextValue {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const STORAGE_KEY = 'sidebarCollapsed';

const UIContext = createContext<UIContextValue | undefined>(undefined);

const readInitialCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch (e) {
    // localStorage недоступен — игнорируем
  }
  // По умолчанию sidebar раскрыт (клиент попросил)
  return false;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(readInitialCollapsed);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed));
    } catch (e) {
      // ignore
    }
  }, [isSidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsedState((prev) => !prev);
  }, []);

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setIsSidebarCollapsedState(value);
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      searchQuery,
      setSearchQuery,
    }),
    [isSidebarCollapsed, toggleSidebar, setSidebarCollapsed, searchQuery]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextValue => {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within UIProvider');
  }
  return ctx;
};
