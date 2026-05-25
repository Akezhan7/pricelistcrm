import React from 'react';
import { Sidebar } from './Sidebar';
import { useUI } from '../context/UIContext';

interface LayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  fullHeight?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  searchQuery,
  onSearchChange,
  fullHeight = false,
}) => {
  const { isSidebarCollapsed } = useUI();
  const sidebarWidth = isSidebarCollapsed ? 80 : 256;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <main
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {fullHeight ? (
          <div className="flex-1 p-6 overflow-hidden">{children}</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
};
