export type NotificationType =
  | 'new_lead_sales'
  | 'sla_warning_sales'
  | 'sla_breached_sales'
  | 'new_lead_am'
  | 'sla_warning_am'
  | 'sla_breached_am'
  | 'reviewed_for_admin'
  | 'reassigned';

export type NotificationCategory = 'assignment' | 'sla' | 'review' | 'reassignment';

export interface AppNotification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  company: string;
  timestamp: string;
  read: boolean;
}

export const NOTIFICATION_TYPE_META: Record<NotificationType, { icon: string; category: NotificationCategory; tone: 'info' | 'warning' | 'critical' | 'success' }> = {
  new_lead_sales: { icon: 'plus', category: 'assignment', tone: 'info' },
  sla_warning_sales: { icon: 'clock', category: 'sla', tone: 'warning' },
  sla_breached_sales: { icon: 'alert', category: 'sla', tone: 'critical' },
  new_lead_am: { icon: 'user-check', category: 'assignment', tone: 'info' },
  sla_warning_am: { icon: 'clock', category: 'sla', tone: 'warning' },
  sla_breached_am: { icon: 'alert', category: 'sla', tone: 'critical' },
  reviewed_for_admin: { icon: 'check', category: 'review', tone: 'success' },
  reassigned: { icon: 'shuffle', category: 'reassignment', tone: 'info' },
};

export const MOCK_NOTIFICATIONS: AppNotification[] = [];
