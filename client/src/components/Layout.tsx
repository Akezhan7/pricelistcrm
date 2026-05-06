import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';

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
  fullHeight = false 
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(80);

  useEffect(() => {
    const handleSidebarChange = (e: CustomEvent) => {
      setSidebarWidth(e.detail.width);
    };

    window.addEventListener('sidebar-width-change' as any, handleSidebarChange);
    return () => window.removeEventListener('sidebar-width-change' as any, handleSidebarChange);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <main 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {fullHeight ? (
          <div className="flex-1 p-6 overflow-hidden">
            {children}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
