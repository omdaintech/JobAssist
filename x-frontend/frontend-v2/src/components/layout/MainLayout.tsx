import React from 'react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />
      <main className="flex-1 w-full">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}; 