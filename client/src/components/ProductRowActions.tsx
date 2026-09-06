import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconButton } from './ui';

export type ProductRowAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
};

type ProductRowActionsProps = {
  primaryActions?: ProductRowAction[];
  overflowActions?: ProductRowAction[];
};

export const ProductRowActions: React.FC<ProductRowActionsProps> = ({
  primaryActions = [],
  overflowActions = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 8 });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target)
        && !menuRef.current?.contains(target)
      ) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const closeMenu = () => setIsOpen(false);

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const buttonRect = menuButtonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      const desktop = typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 640px)').matches
        : false;
      const visibleActions = overflowActions.length + (desktop ? 0 : primaryActions.length);
      const estimatedHeight = visibleActions * 40 + 8;
      const availableBelow = window.innerHeight - buttonRect.bottom - 8;
      const openUpward = availableBelow < estimatedHeight && buttonRect.top > availableBelow;

      setMenuPosition({
        top: openUpward
          ? Math.max(8, buttonRect.top - estimatedHeight - 4)
          : buttonRect.bottom + 4,
        right: Math.max(8, window.innerWidth - buttonRect.right),
      });
    }
    setIsOpen(true);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center gap-0.5', isOpen && 'z-30')}
      onClick={(event) => event.stopPropagation()}
    >
      {primaryActions.map((action) => (
        <IconButton
          key={action.key}
          icon={action.icon}
          title={action.label}
          size="sm"
          variant={action.danger ? 'danger' : 'ghost'}
          className="hidden sm:inline-flex"
          onClick={action.onClick}
        />
      ))}

      {(primaryActions.length > 0 || overflowActions.length > 0) && (
        <>
          <IconButton
            ref={menuButtonRef}
            icon={MoreVertical}
            title="Другие действия"
            size="sm"
            variant="ghost"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className={overflowActions.length === 0 ? 'sm:hidden' : undefined}
            onClick={toggleMenu}
          />
          {isOpen && createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-50 min-w-[13rem] overflow-y-auto rounded-lg border border-border-subtle bg-brand-white py-1 shadow-card"
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
                maxHeight: 'calc(100vh - 16px)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {primaryActions.map((action) => (
                <button
                  key={`mobile-${action.key}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-inset sm:hidden',
                    action.danger ? 'text-danger' : 'text-brand-black'
                  )}
                >
                  <action.icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{action.label}</span>
                </button>
              ))}
              {overflowActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-inset',
                    action.danger ? 'text-danger' : 'text-brand-black'
                  )}
                >
                  <action.icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};
