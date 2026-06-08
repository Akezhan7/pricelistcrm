import React from 'react';
import { Card, CardBody } from './ui';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-surface-page py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased">
    <div className="max-w-md w-full">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-10 w-1 bg-brand-yellow rounded-full flex-shrink-0" aria-hidden />
          <div className="text-left min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-brand-black leading-tight">
              Plastkrep <span className="text-gray-400 font-semibold">CRM</span>
            </h2>
            <p className="text-[11px] text-gray-400 tracking-wide uppercase mt-0.5">
              Стройматериалы
            </p>
          </div>
        </div>
        <h1 className="text-page-title text-brand-black tracking-tight">{title}</h1>
        <p className="mt-2 text-body text-text-muted">{subtitle}</p>
      </div>

      <Card variant="elevated" className="shadow-md transition-shadow duration-200">
        <CardBody className="py-6 sm:py-8">{children}</CardBody>
      </Card>

      <p className="mt-8 text-center text-caption text-text-muted">
        © {new Date().getFullYear()} Plastkrep CRM
      </p>
    </div>
  </div>
);
