import { useMemo } from 'react';
import { useAuth, type AccessHistoryEntry } from './auth';
import { useStore, type ActivityEntry } from './store';

export type AuditAction =
  | 'surfaced'
  | 'assigned_to_dept'
  | 'dept_viewed'
  | 'dept_acknowledged'
  | 'assigned_to_am'
  | 'reassigned'
  | 'review_started'
  | 'review_saved'
  | 'review_submitted'
  | 'returned_for_review'
  | 'sla_approaching'
  | 'sla_breached'
  | 'admin_decision'
  | 'nominated'
  | 'not_nominatable'
  | 'deferred'
  | 'archived'
  | 'access_granted'
  | 'access_revoked';

export const ACTION_LABELS: Record<AuditAction, string> = {
  surfaced: 'Lead Surfaced',
  assigned_to_dept: 'Assigned to Sales Department',
  dept_viewed: 'Department Viewed',
  dept_acknowledged: 'Department Acknowledged',
  assigned_to_am: 'Assigned to Account Manager',
  reassigned: 'Lead Reassigned',
  review_started: 'Review Started',
  review_saved: 'Review Saved',
  review_submitted: 'Review Submitted',
  returned_for_review: 'Returned for Review',
  sla_approaching: 'SLA Approaching',
  sla_breached: 'SLA Breached',
  admin_decision: 'Administrator Decision',
  nominated: 'Nominated to CRM',
  not_nominatable: 'Marked Not Nominatable',
  deferred: 'Deferred',
  archived: 'Archived',
  access_granted: 'Access Granted',
  access_revoked: 'Access Revoked',
};

export type AuditRole = 'System' | 'Administrator' | 'Sales Department' | 'Account Manager';

export interface AuditEvent {
  id: string;
  user: string;
  role: AuditRole;
  action: AuditAction;
  actionLabel: string;
  opportunityId: string | null;
  company: string | null;
  timestamp: string;
  timestampValue: number;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  department: string | null;
  accountManager: string | null;
}

function classifyStoreAction(action: string): AuditAction | null {
  const lower = action.toLowerCase();
  if (lower.includes('routed to')) return 'assigned_to_dept';
  if (lower.includes('acknowledged')) return 'dept_acknowledged';
  if (lower.includes('reassigned')) return 'reassigned';
  if (lower.includes('assigned to')) return 'assigned_to_am';
  if (lower.includes('review started')) return 'review_started';
  if (lower.includes('review saved')) return 'review_saved';
  if (lower.includes('submitted as reviewed')) return 'review_submitted';
  if (lower.includes('returned for review')) return 'returned_for_review';
  if (lower.includes('nominated')) return 'nominated';
  if (lower.includes('not nominatable')) return 'not_nominatable';
  if (lower.includes('deferred')) return 'deferred';
  if (lower.includes('archived')) return 'archived';
  if (lower.includes('note added')) return 'review_saved';
  if (lower.includes('missing information')) return 'review_saved';
  if (lower.includes('review restarted')) return 'review_started';
  return null;
}

const NOW = new Date().getTime();

function parseTimelineTimestamp(ts: string): number {
  const match = ts.match(/(\w+)\s+(\d+),\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)/);
  if (!match) return NOW;
  const [, monthName, day, year, hour, minute, period] = match;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  let h = parseInt(hour, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return new Date(parseInt(year, 10), months[monthName] ?? 8, parseInt(day, 10), h, parseInt(minute, 10)).getTime();
}

function storeEventToAuditEvent(entry: ActivityEntry): AuditEvent | null {
  const action = classifyStoreAction(entry.action);
  if (!action) return null;
  const tsValue = parseTimelineTimestamp(entry.timestamp);
  const role: AuditRole = entry.role === 'Administrator' ? 'Administrator'
    : entry.role === 'Sales Department' ? 'Sales Department'
    : entry.role === 'Account Manager' ? 'Account Manager'
    : 'System';
  return {
    id: entry.id,
    user: entry.user,
    role,
    action,
    actionLabel: ACTION_LABELS[action],
    opportunityId: entry.opportunityId,
    company: entry.company,
    timestamp: entry.timestamp,
    timestampValue: tsValue,
    previousStatus: entry.previousStatus,
    newStatus: entry.newStatus,
    reason: entry.reason,
    department: entry.department,
    accountManager: entry.accountManager,
  };
}

function deriveAccessEvents(history: AccessHistoryEntry[]): AuditEvent[] {
  return history.map((entry) => {
    const action: AuditAction = entry.action === 'granted' ? 'access_granted' : 'access_revoked';
    const ts = entry.action === 'granted' ? entry.grantedAt : (entry.revokedAt ?? entry.grantedAt);
    return {
      id: `access-${entry.id}`,
      user: entry.grantedBy,
      role: 'Administrator' as AuditRole,
      action,
      actionLabel: ACTION_LABELS[action],
      opportunityId: null,
      company: null,
      timestamp: new Date(ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      timestampValue: ts,
      previousStatus: null,
      newStatus: null,
      reason: null,
      department: null,
      accountManager: null,
    };
  });
}

export function useAuditEvents(): AuditEvent[] {
  const { accessHistory } = useAuth();
  const { activityEvents } = useStore();
  return useMemo(() => {
    const accessEvents = deriveAccessEvents(accessHistory);
    const liveEvents = activityEvents
      .map(storeEventToAuditEvent)
      .filter((e): e is AuditEvent => e !== null);
    const all = [...liveEvents, ...accessEvents];
    const seen = new Set<string>();
    const deduped = all.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    deduped.sort((a, b) => b.timestampValue - a.timestampValue);
    return deduped;
  }, [accessHistory, activityEvents]);
}

export function getUniqueUsers(events: AuditEvent[]): string[] {
  const set = new Set<string>();
  events.forEach((e) => set.add(e.user));
  return Array.from(set).sort();
}

export function getUniqueRoles(events: AuditEvent[]): AuditRole[] {
  const set = new Set<AuditRole>();
  events.forEach((e) => set.add(e.role));
  return Array.from(set).sort();
}

export function getUniqueActions(events: AuditEvent[]): AuditAction[] {
  const order: AuditAction[] = [
    'surfaced', 'assigned_to_dept', 'dept_viewed', 'dept_acknowledged',
    'assigned_to_am', 'reassigned', 'review_started', 'review_saved',
    'review_submitted', 'returned_for_review', 'sla_approaching',
    'sla_breached', 'admin_decision', 'nominated', 'not_nominatable',
    'deferred', 'archived', 'access_granted', 'access_revoked',
  ];
  const set = new Set<AuditAction>();
  events.forEach((e) => set.add(e.action));
  return order.filter((a) => set.has(a));
}

export function getUniqueOpportunities(events: AuditEvent[]): { id: string; label: string }[] {
  const map = new Map<string, string>();
  events.forEach((e) => {
    if (e.opportunityId && e.company) {
      map.set(e.opportunityId, e.company);
    }
  });
  return Array.from(map.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getUniqueDepartments(events: AuditEvent[]): string[] {
  const set = new Set<string>();
  events.forEach((e) => { if (e.department) set.add(e.department); });
  return Array.from(set).sort();
}

export function getUniqueStatuses(events: AuditEvent[]): string[] {
  const set = new Set<string>();
  events.forEach((e) => {
    if (e.newStatus) set.add(e.newStatus);
    if (e.previousStatus) set.add(e.previousStatus);
  });
  return Array.from(set).sort();
}
