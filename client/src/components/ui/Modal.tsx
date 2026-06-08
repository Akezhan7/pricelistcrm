import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  elevated?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openModalCount = 0;

function lockBodyScroll() {
  openModalCount += 1;
  if (openModalCount === 1) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  footer,
  children,
  elevated = false,
  closeOnOverlayClick = true,
  className,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    lockBodyScroll();
    document.addEventListener('keydown', handleKeyDown);

    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        panel.focus();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const zIndex = elevated ? 'z-[60]' : 'z-50';

  return createPortal(
    <div className={cn('fixed inset-0', zIndex)} aria-hidden={false}>
      <div
        className="fixed inset-0 bg-brand-black/50 backdrop-blur-[3px] animate-overlay-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={cn(
            'relative flex flex-col bg-surface-overlay shadow-xl pointer-events-auto',
            'w-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden',
            'border-t sm:border border-border-subtle',
            'rounded-t-2xl sm:rounded-modal animate-modal-in',
            'max-sm:h-auto max-sm:max-h-[92vh]',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-4 border-b border-border-subtle flex-shrink-0">
            {title ? (
              <h2
                id={titleId}
                className="text-section-title text-brand-black tracking-tight truncate"
              >
                {title}
              </h2>
            ) : (
              <span className="flex-1" aria-hidden />
            )}
            <IconButton
              icon={X}
              title="Закрыть"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="flex-shrink-0 -mr-1"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>

          {footer && (
            <div className="flex-shrink-0 border-t border-border-subtle bg-surface-page/80 max-sm:pb-safe">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
