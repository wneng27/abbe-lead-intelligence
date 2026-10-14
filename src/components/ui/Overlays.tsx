import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { IconButton, Button } from './Button';

/* ─── Tooltip ─── */

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

export const Tooltip = ({ content, children, side = 'top', delay = 300, className }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const childRef = useRef<HTMLElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (childRef.current) {
        const rect = childRef.current.getBoundingClientRect();
        const positions = {
          top: { top: rect.top - 8, left: rect.left + rect.width / 2 },
          bottom: { top: rect.bottom + 8, left: rect.left + rect.width / 2 },
          left: { top: rect.top + rect.height / 2, left: rect.left - 8 },
          right: { top: rect.top + rect.height / 2, left: rect.right + 8 },
        };
        setCoords(positions[side]);
      }
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const sideStyles: Record<string, React.CSSProperties> = {
    top: { transform: 'translate(-50%, -100%)' },
    bottom: { transform: 'translate(-50%, 0)' },
    left: { transform: 'translate(-100%, -50%)' },
    right: { transform: 'translate(0, -50%)' },
  };

  return (
    <>
      {React.cloneElement(children, {
        ref: childRef,
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
      })}
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              'fixed z-[100] px-2.5 py-1.5 rounded-md bg-ink-900 text-white text-xs font-medium shadow-lg pointer-events-none animate-fade-in',
              className
            )}
            style={{ top: coords.top, left: coords.left, ...sideStyles[side] }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};

/* ─── Dropdown Menu ─── */

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactElement;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu = ({ trigger, items, align = 'right', className }: DropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {React.cloneElement(trigger, {
        type: 'button',
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setTriggerRect(rect);
          setOpen((current) => !current);
        },
      })}
      {open && triggerRect &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              'fixed z-[100] min-w-[180px] rounded-lg border border-border bg-card shadow-lg py-1 animate-slide-in-up',
              align === 'right' ? 'origin-top-right' : 'origin-top-left'
            )}
            style={{
              top: triggerRect.bottom + 4,
              left: align === 'right' ? triggerRect.right - 180 : triggerRect.left,
            }}
          >
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className="h-px bg-border my-1" />
              ) : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 transition-colors',
                    'hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none',
                    item.destructive
                      ? 'text-critical dark:text-critical-light hover:bg-critical/5'
                      : 'text-foreground'
                  )}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ─── Modal ─── */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement;
    const focusTimer = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable?.[0]?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full rounded-2xl bg-card border border-border shadow-xl animate-scale-in',
          modalSizes[size],
          className
        )}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-2">
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        )}
        <IconButton
          label="Close"
          onClick={onClose}
          className="absolute right-4 top-4"
          size="icon-sm"
        >
          <X className="h-4 w-4" />
        </IconButton>
        {children && <div className="px-6 py-4">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/* ─── Confirmation Modal ─── */

export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: ConfirmationModalProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            size="md"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  );
};

/* ─── Drawer ─── */

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
}

export const Drawer = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 'max-w-md',
}: DrawerProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute top-0 bottom-0 w-full bg-card border-border shadow-xl flex flex-col animate-slide-in-right',
          width,
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
        )}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-4 border-b border-border">
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/* ─── Toast ─── */

type ToastVariant = 'default' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const toastVariants: Record<ToastVariant, { border: string; icon: React.ReactNode }> = {
  default: { border: 'border-border', icon: null },
  success: { border: 'border-success/30', icon: <span className="h-2 w-2 rounded-full bg-success" /> },
  warning: { border: 'border-warning/30', icon: <span className="h-2 w-2 rounded-full bg-warning" /> },
  error: { border: 'border-critical/30', icon: <span className="h-2 w-2 rounded-full bg-critical" /> },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, duration: 4000, ...t };
    setToasts((prev) => [...prev, item]);
    if (item.duration) {
      setTimeout(() => dismiss(id), item.duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
          {toasts.map((t) => {
            const v = toastVariants[t.variant || 'default'];
            return (
              <div
                key={t.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border bg-card shadow-lg p-4 animate-slide-in-right',
                  v.border
                )}
                role="alert"
              >
                {v.icon && <span className="mt-1.5 shrink-0">{v.icon}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

/* ─── Alert ─── */

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const alertConfig: Record<
  AlertVariant,
  { container: string; icon: React.ReactNode; title: string }
> = {
  info: {
    container: 'bg-ink-50 dark:bg-ink-600/30 border-ink-200 dark:border-ink-500 text-ink-700 dark:text-ink-200',
    icon: <span className="h-4 w-4 rounded-full bg-ink-500 text-white flex items-center justify-center text-2xs font-bold">i</span>,
    title: 'text-ink-700 dark:text-ink-200',
  },
  success: {
    container: 'bg-success/5 border-success/20 text-success',
    icon: <span className="h-4 w-4 rounded-full bg-success text-white flex items-center justify-center text-2xs">✓</span>,
    title: 'text-success',
  },
  warning: {
    container: 'bg-warning/5 border-warning/30 text-ink-700 dark:text-warning',
    icon: <span className="h-4 w-4 rounded-full bg-warning text-ink-900 flex items-center justify-center text-2xs font-bold">!</span>,
    title: 'text-ink-700 dark:text-warning',
  },
  error: {
    container: 'bg-critical/5 border-critical/20 text-critical dark:text-critical-light',
    icon: <span className="h-4 w-4 rounded-full bg-critical text-white flex items-center justify-center text-2xs font-bold">×</span>,
    title: 'text-critical dark:text-critical-light',
  },
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert = ({ variant = 'info', title, children, onClose, className }: AlertProps) => {
  const config = alertConfig[variant];
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        config.container,
        className
      )}
    >
      <span className="mt-0.5 shrink-0">{config.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={cn('text-sm font-semibold', config.title)}>{title}</p>}
        {children && <div className="text-sm text-muted-foreground mt-0.5">{children}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
