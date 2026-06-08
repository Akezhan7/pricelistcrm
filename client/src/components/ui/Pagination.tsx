import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export type PaginationVariant = 'default' | 'numbered';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  variant?: PaginationVariant;
  className?: string;
}

function getVisiblePages(currentPage: number, totalPages: number, maxVisible = 5): number[] {
  const count = Math.min(maxVisible, totalPages);
  return Array.from({ length: count }, (_, i) => {
    if (totalPages <= maxVisible) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - maxVisible + 1 + i;
    return currentPage - 2 + i;
  });
}

const pageButtonBase =
  'inline-flex items-center justify-center min-h-9 min-w-9 text-caption font-medium rounded-lg ' +
  'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-1';

const navButtonClasses =
  'inline-flex items-center justify-center border border-border-subtle bg-brand-white text-caption font-medium text-text-muted ' +
  'hover:bg-surface-inset hover:text-brand-black disabled:opacity-40 disabled:cursor-not-allowed ' +
  'transition-colors duration-200 rounded-lg min-h-9 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-1';

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  variant = 'default',
  className,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (variant === 'numbered') {
    const visiblePages = getVisiblePages(currentPage, totalPages);

    return (
      <div className={cn('border-t border-border-subtle px-4 py-3 bg-surface-page', className)}>
        <div className="space-y-2.5">
          <div className="text-caption text-text-muted text-center">
            Показано {startItem}–{endItem} из {totalItems}
          </div>
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={cn(pageButtonBase, 'px-2 text-text-muted hover:bg-surface-inset disabled:opacity-30')}
              title="Первая"
            >
              ««
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(pageButtonBase, 'text-text-muted hover:bg-surface-inset disabled:opacity-30')}
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-0.5">
              {visiblePages.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    pageButtonBase,
                    currentPage === pageNum
                      ? 'bg-brand-yellow text-brand-black font-semibold'
                      : 'text-brand-black hover:bg-surface-inset'
                  )}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(pageButtonBase, 'text-text-muted hover:bg-surface-inset disabled:opacity-30')}
              aria-label="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={cn(pageButtonBase, 'px-2 text-text-muted hover:bg-surface-inset disabled:opacity-30')}
              title="Последняя"
            >
              »»
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-surface-base px-4 py-3 flex items-center justify-between border-t border-border-subtle',
        className
      )}
    >
      <div className="flex-1 flex justify-between sm:hidden gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(navButtonClasses, 'px-3 flex-1')}
        >
          Назад
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(navButtonClasses, 'px-3 flex-1')}
        >
          Вперед
        </button>
      </div>

      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <p className="text-caption text-text-muted">
          Показано{' '}
          <span className="font-medium text-brand-black font-tabular">{startItem}</span>–
          <span className="font-medium text-brand-black font-tabular">{endItem}</span> из{' '}
          <span className="font-medium text-brand-black font-tabular">{totalItems}</span>
        </p>
        <nav className="inline-flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(navButtonClasses, 'px-2.5')}
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center px-3 min-h-9 text-caption font-medium text-brand-black bg-surface-inset rounded-lg">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(navButtonClasses, 'px-2.5')}
            aria-label="Следующая страница"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
};
