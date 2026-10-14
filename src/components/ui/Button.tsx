import React from 'react';
import { cn } from '@/lib/utils';

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap select-none';

const buttonSizes = {
  sm: 'text-xs px-3 py-1.5 h-8',
  md: 'text-sm px-4 py-2 h-10',
  lg: 'text-sm px-5 py-2.5 h-12',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
  'icon-lg': 'h-11 w-11',
};

const buttonVariants = {
  primary:
    'bg-gold text-ink-900 hover:bg-gold-400 active:bg-gold-600 shadow-xs',
  secondary:
    'bg-secondary text-foreground hover:bg-border active:bg-border border border-border',
  destructive:
    'bg-critical text-white hover:bg-critical/90 active:bg-critical shadow-xs',
  ghost: 'text-foreground hover:bg-secondary active:bg-border',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-secondary active:bg-border',
  link: 'text-foreground underline-offset-4 hover:underline px-0 h-auto',
};

type ButtonVariant = keyof typeof buttonVariants;
type ButtonSize = keyof typeof buttonSizes;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: 'icon-sm' | 'icon' | 'icon-lg';
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'icon', label, children, ...props }, ref) => {
    const variantClass =
      variant === 'primary'
        ? buttonVariants.primary
        : variant === 'secondary'
          ? buttonVariants.secondary
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary active:bg-border';
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(buttonBase, buttonSizes[size], variantClass, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
