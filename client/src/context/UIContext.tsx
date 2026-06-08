import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const MD_MEDIA_QUERY = '(min-width: 768px)';
const STORAGE_KEY = 'sidebarCollapsed';

interface UIContextValue {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

const readInitialCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // localStorage недоступен — игнорируем
  }
  return false;
};

const readInitialIsMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia(MD_MEDIA_QUERY).matches;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(readInitialCollapsed);
  const [isMobile, setIsMobile] = useState<boolean>(readInitialIsMobile);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed));
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const mql = window.matchMedia(MD_MEDIA_QUERY);

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matchesDesktop = event.matches;
      setIsMobile(!matchesDesktop);
      if (matchesDesktop) {
        setIsMobileMenuOpen(false);
      }
    };

    handleChange(mql);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, isMobileMenuOpen]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsedState((prev) => !prev);
  }, []);

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setIsSidebarCollapsedState(value);
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      isMobile,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      searchQuery,
      setSearchQuery,
    }),
    [
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      isMobile,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      searchQuery,
    ]
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
