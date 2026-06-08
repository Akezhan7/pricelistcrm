import React from 'react';
import { cn } from '../../utils/cn';

export interface TableProps {
  className?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export const Table: React.FC<TableProps> = ({
  className,
  children,
  scrollable = true,
}) => {
  const table = (
    <table className={cn('min-w-full border-collapse', className)}>{children}</table>
  );

  if (!scrollable) return table;

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-base">
      {table}
    </div>
  );
};

export interface TableHeadProps {
  className?: string;
  children: React.ReactNode;
  sticky?: boolean;
}

export const TableHead: React.FC<TableHeadProps> = ({
  className,
  children,
  sticky = false,
}) => {
  return (
    <thead
      className={cn(
        'bg-surface-base border-b border-border-subtle',
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      {children}
    </thead>
  );
};

export interface TableBodyProps {
  className?: string;
  children: React.ReactNode;
  zebra?: boolean;
}

export const TableBody: React.FC<TableBodyProps> = ({
  className,
  children,
  zebra = false,
}) => {
  return (
    <tbody
      className={cn(
        'bg-surface-base',
        zebra && '[&>tr:nth-child(even)]:bg-surface-page/60',
        className
      )}
    >
      {children}
    </tbody>
  );
};

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
  children: React.ReactNode;
}

export const TableRow: React.FC<TableRowProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tr
      className={cn(
        'min-h-[52px] border-b border-border-subtle last:border-b-0',
        'hover:bg-surface-inset/50 transition-colors duration-200',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
  children: React.ReactNode;
}

export const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left typography-overline text-text-muted font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
  children: React.ReactNode;
}

export const TableCell: React.FC<TableCellProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <td
      className={cn(
        'px-4 py-3.5 text-body text-brand-black align-middle',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
};
