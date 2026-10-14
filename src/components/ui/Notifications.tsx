import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Bell,
  X,
  Plus,
  Clock,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Shuffle,
  Check,
} from 'lucide-react';
import {
  NOTIFICATION_TYPE_META,
  type AppNotification,
  type NotificationType,
} from '@/lib/notifications';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  plus: Plus,
  clock: Clock,
  alert: AlertTriangle,
  'user-check': UserCheck,
  check: CheckCircle2,
  shuffle: Shuffle,
};

const TONE_STYLES: Record<string, { dot: string; iconBg: string }> = {
  info: { dot: 'bg-blue-500', iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  warning: { dot: 'bg-warning', iconBg: 'bg-warning-light text-ink-800 dark:bg-warning/15 dark:text-warning' },
  critical: { dot: 'bg-critical', iconBg: 'bg-critical/10 text-critical dark:bg-critical/15 dark:text-critical-light' },
  success: { dot: 'bg-success', iconBg: 'bg-success-light text-success dark:bg-success/15 dark:text-success' },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-2xs font-bold text-white dark:text-ink-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] z-[300] origin-top-right"
        >
          <div className="rounded-xl border border-border bg-card shadow-lg shadow-ink-900/5 dark:shadow-ink-950/20 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-critical/10 text-critical dark:text-critical-light text-2xs font-bold px-1.5 py-0.5">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-2xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[28rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <Bell className="h-6 w-6 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">You're all caught up.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = NOTIFICATION_TYPE_META[n.type as NotificationType];
                  const Icon = ICON_MAP[meta.icon] ?? Bell;
                  const tone = TONE_STYLES[meta.tone];
                  return (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        'w-full text-left flex gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-secondary/40',
                        !n.read && 'bg-secondary/20'
                      )}
                    >
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', tone.iconBg)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {!n.read && <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', tone.dot)} />}
                          <p className={cn('text-sm font-medium text-foreground leading-snug', n.read && 'pl-4')}>
                            {n.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-2xs font-medium text-foreground/70">{n.company}</span>
                          <span className="text-2xs text-muted-foreground/60">·</span>
                          <span className="text-2xs text-muted-foreground/80">{n.timestamp}</span>
                          <span className="text-2xs text-muted-foreground/60">·</span>
                          <span className="inline-flex items-center gap-0.5 text-2xs font-medium text-muted-foreground/70 italic">
                            <Bell className="h-2.5 w-2.5" />
                            Preview — not sent
                          </span>
                        </div>
                      </div>
                      {n.read && <Check className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-secondary/20">
              <p className="text-2xs text-muted-foreground text-center leading-relaxed">
                These are preview notifications. Email delivery will be enabled in a future update.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
