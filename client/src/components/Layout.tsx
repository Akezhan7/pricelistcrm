import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, searchQuery, onSearchChange }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar searchQuery={searchQuery} onSearchChange={onSearchChange} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col ml-64 overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
