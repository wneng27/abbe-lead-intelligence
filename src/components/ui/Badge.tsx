import React from 'react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG, type Status, type Priority } from '@/lib/tokens';

/* ─── Badge ─── */

type BadgeVariant = 'default' | 'gold' | 'success' | 'warning' | 'risk' | 'critical' | 'outline';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-secondary text-foreground border-border',
  gold: 'bg-gold-50 text-gold-700 dark:bg-gold/15 dark:text-gold border-gold-200 dark:border-gold/20',
  success: 'bg-success/10 text-success border-success/20 dark:text-success',
  warning: 'bg-warning-light text-ink-700 dark:bg-warning/15 dark:text-warning border-warning/30',
  risk: 'bg-risk/10 text-risk border-risk/20 dark:text-risk',
  critical: 'bg-critical/10 text-critical dark:text-critical-light border-critical/20',
  outline: 'bg-transparent text-foreground border-border',
};

type BadgeSize = 'sm' | 'md';

const badgeSizes: Record<BadgeSize, string> = {
  sm: 'text-2xs px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-0.5 gap-1.5',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotClass?: string;
  className?: string;
  children: React.ReactNode;
}

export const Badge = ({
  variant = 'default',
  size = 'md',
  dot = false,
  dotClass,
  className,
  children,
}: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotClass || 'bg-current')} />
      )}
      {children}
    </span>
  );
};

/* ─── Status Badge ─── */

export interface StatusBadgeProps {
  status: Status;
  size?: BadgeSize;
  dot?: boolean;
  shortLabel?: boolean;
  className?: string;
}

export const StatusBadge = ({
  status,
  size = 'md',
  dot = true,
  shortLabel = false,
  className,
}: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    shortLabel: status,
    dotClass: 'bg-muted-foreground',
    badgeClass: 'bg-secondary text-muted-foreground border-border',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        config.badgeClass,
        badgeSizes[size],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />}
      {shortLabel ? config.shortLabel : config.label}
    </span>
  );
};

/* ─── Priority Badge ─── */

export interface PriorityBadgeProps {
  priority: Priority;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export const PriorityBadge = ({
  priority,
  size = 'md',
  dot = true,
  className,
}: PriorityBadgeProps) => {
  const config = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    badgeClass: 'bg-secondary text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        config.badgeClass,
        badgeSizes[size],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />}
      {config.label}
    </span>
  );
};
