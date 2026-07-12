import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export type RequirementItem = {
  label: string;
  met: boolean;
  detail?: string;
};

type RequirementsChecklistProps = {
  title?: string;
  items: RequirementItem[];
  className?: string;
};

export const RequirementsChecklist: React.FC<RequirementsChecklistProps> = ({
  title = 'Что нужно для перехода',
  items,
  className,
}) => {
  const missingCount = items.filter((item) => !item.met).length;

  return (
    <div className={cn('rounded-xl border border-border-subtle bg-brand-white p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-body-medium text-brand-black">{title}</h4>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-caption font-medium',
            missingCount === 0
              ? 'bg-success-light text-success-dark'
              : 'bg-warning-light text-warning-dark'
          )}
        >
          {missingCount === 0 ? 'Готово' : `Не хватает: ${missingCount}`}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.met ? CheckCircle2 : AlertCircle;
          return (
            <li key={item.label} className="flex items-start gap-2 text-body">
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  item.met ? 'text-success' : 'text-warning-dark'
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <p className={item.met ? 'text-brand-black' : 'text-text-muted'}>{item.label}</p>
                {item.detail && <p className="text-caption text-text-muted">{item.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
