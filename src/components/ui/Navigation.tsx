import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

/* ─── Tabs ─── */

export interface TabItem {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const Tabs = ({ items, value, onChange, className, size = 'md' }: TabsProps) => {
  return (
    <div className={cn('border-b border-border', className)}>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {items.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              disabled={tab.disabled}
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative inline-flex items-center gap-2 font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
                size === 'sm' ? 'text-xs px-3 py-2' : 'text-sm px-4 py-2.5',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full text-2xs font-semibold px-1.5 h-4 min-w-4',
                    isActive
                      ? 'bg-gold-50 text-gold-700 dark:bg-gold/15 dark:text-gold'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Breadcrumb ─── */

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={item.onClick}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/* ─── Page Header ─── */

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumb && <div>{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

/* ─── Section Header ─── */

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const SectionHeader = ({
  title,
  description,
  actions,
  icon,
  className,
}: SectionHeaderProps) => {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div className="flex items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
