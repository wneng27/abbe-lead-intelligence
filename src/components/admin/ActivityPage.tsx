import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Breadcrumb,
  SectionHeader,
  EmptyState,
  Skeleton,
  SkeletonCard,
  Select,
  SearchInput,
  type SelectOption,
} from '@/components/ui';
import {
  Activity as ActivityIcon,
  Eye,
  CheckCircle2,
  ArrowRight,
  Trophy,
  ClipboardList,
  Undo2,
  UserPlus,
  Shield,
  ShieldOff,
  Building2,
  Filter,
  X,
  Inbox,
  Globe,
  Play,
  Save,
  AlertTriangle,
  Clock,
  Archive,
  FileText,
} from 'lucide-react';
import type { Role } from '@/lib/navigation';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import {
  useAuditEvents,
  getUniqueUsers,
  getUniqueRoles,
  getUniqueActions,
  getUniqueOpportunities,
  getUniqueDepartments,
  getUniqueStatuses,
  ACTION_LABELS,
  type AuditEvent,
  type AuditAction,
  type AuditRole,
} from '@/lib/activity';

const ACTION_ICONS: Record<AuditAction, typeof Eye> = {
  surfaced: Globe,
  assigned_to_dept: Building2,
  dept_viewed: Eye,
  dept_acknowledged: CheckCircle2,
  assigned_to_am: UserPlus,
  reassigned: ArrowRight,
  review_started: Play,
  review_saved: Save,
  review_submitted: CheckCircle2,
  returned_for_review: Undo2,
  sla_approaching: Clock,
  sla_breached: AlertTriangle,
  admin_decision: Shield,
  nominated: Trophy,
  not_nominatable: ShieldOff,
  deferred: Clock,
  archived: Archive,
  access_granted: Shield,
  access_revoked: ShieldOff,
};

const ACTION_ICON_CLASSES: Record<AuditAction, string> = {
  surfaced: 'bg-secondary text-muted-foreground',
  assigned_to_dept: 'bg-info/10 text-info',
  dept_viewed: 'bg-secondary text-muted-foreground',
  dept_acknowledged: 'bg-success/10 text-success',
  assigned_to_am: 'bg-gold/10 text-gold',
  reassigned: 'bg-gold/10 text-gold',
  review_started: 'bg-info/10 text-info',
  review_saved: 'bg-secondary text-muted-foreground',
  review_submitted: 'bg-success/10 text-success',
  returned_for_review: 'bg-critical/10 text-critical dark:text-critical-light',
  sla_approaching: 'bg-warning-light text-ink-800 dark:bg-warning/15 dark:text-warning',
  sla_breached: 'bg-critical/10 text-critical dark:text-critical-light',
  admin_decision: 'bg-info/10 text-info',
  nominated: 'bg-gold/10 text-gold',
  not_nominatable: 'bg-critical/10 text-critical dark:text-critical-light',
  deferred: 'bg-secondary text-muted-foreground',
  archived: 'bg-secondary text-muted-foreground',
  access_granted: 'bg-success/10 text-success',
  access_revoked: 'bg-critical/10 text-critical dark:text-critical-light',
};

const ROLE_BADGE_CLASS: Record<AuditRole, string> = {
  System: 'bg-secondary text-muted-foreground border-border',
  Administrator: 'bg-info/10 text-info border-info/20 dark:bg-info/15 dark:text-info',
  'Sales Department': 'bg-gold/10 text-gold border-gold/20',
  'Account Manager': 'bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success',
};

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    assigned_to_dept: 'Assigned to Sales Department',
    dept_viewed: 'Department Viewed',
    assigned_to_am: 'Assigned to Account Manager',
    in_review: 'In Review',
    reviewed: 'Reviewed',
    ready_for_admin: 'Ready for Administrator Decision',
    returned_for_review: 'Returned for Review',
    nominated: 'Nominated to CRM',
    not_nominatable: 'Not Nominatable',
    deferred: 'Deferred',
    sla_breached: 'SLA Breached',
    reassigned: 'Reassigned',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 px-1.5 py-0.5 text-2xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function AuditRow({ event, onViewOpportunity }: { event: AuditEvent; onViewOpportunity: (id: string) => void }) {
  const Icon = ACTION_ICONS[event.action];
  const hasOpp = event.opportunityId !== null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3.5 first:pt-0 last:pb-0',
        hasOpp && 'cursor-pointer hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'
      )}
      onClick={hasOpp ? () => onViewOpportunity(event.opportunityId!) : undefined}
      onKeyDown={hasOpp ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewOpportunity(event.opportunityId!); } } : undefined}
      role={hasOpp ? 'button' : undefined}
      tabIndex={hasOpp ? 0 : undefined}
      aria-label={hasOpp ? `View ${event.company}` : undefined}
    >
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full shrink-0 mt-0.5', ACTION_ICON_CLASSES[event.action])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-foreground leading-snug">
            <span className="font-semibold">{event.user}</span>{' '}
            <span className="text-muted-foreground">{event.actionLabel}</span>
            {hasOpp && (
              <>
                {' — '}
                <span className="font-medium text-gold hover:underline">{event.company}</span>
              </>
            )}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">{event.timestamp}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium', ROLE_BADGE_CLASS[event.role])}>
            {event.role}
          </span>
          {event.previousStatus && event.newStatus && (
            <MetaChip label="Status" value={`${formatStatusLabel(event.previousStatus)} → ${formatStatusLabel(event.newStatus)}`} />
          )}
          {event.previousStatus && !event.newStatus && <MetaChip label="From" value={formatStatusLabel(event.previousStatus)} />}
          {event.newStatus && !event.previousStatus && <MetaChip label="Status" value={formatStatusLabel(event.newStatus)} />}
          {event.department && <MetaChip label="Dept" value={event.department} />}
          {event.accountManager && <MetaChip label="AM" value={event.accountManager} />}
          {event.reason && (
            <span className="inline-flex items-center rounded-md border border-border bg-secondary/20 px-1.5 py-0.5 text-2xs text-muted-foreground italic">
              {event.reason}
            </span>
          )}
        </div>
      </div>
      {hasOpp && <Eye className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />}
    </div>
  );
}

type DateFilter = 'all' | 'today' | '7d' | '30d';
const DATE_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

const REFERENCE_NOW = Date.now();

function matchesDateFilter(tsValue: number, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const diff = REFERENCE_NOW - tsValue;
  if (filter === 'today') return diff < 24 * 60 * 60 * 1000;
  if (filter === '7d') return diff < 7 * 24 * 60 * 60 * 1000;
  if (filter === '30d') return diff < 30 * 24 * 60 * 60 * 1000;
  return true;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'assigned_to_dept', label: 'Assigned to Sales Department' },
  { value: 'dept_viewed', label: 'Department Viewed' },
  { value: 'assigned_to_am', label: 'Assigned to Account Manager' },
  { value: 'in_review', label: 'In Review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'ready_for_admin', label: 'Ready for Administrator Decision' },
  { value: 'returned_for_review', label: 'Returned for Review' },
  { value: 'nominated', label: 'Nominated to CRM' },
  { value: 'not_nominatable', label: 'Not Nominatable' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'sla_breached', label: 'SLA Breached' },
  { value: 'reassigned', label: 'Reassigned' },
  { value: 'archived', label: 'Archived' },
];

export function ActivityPage({ role, onSelectOpportunity }: { role: Role; onSelectOpportunity?: (id: string) => void }) {
  const { user } = useAuth();
  const userDept = user?.department ?? '';
  const allEvents = useAuditEvents();
  const { loading: storeLoading } = useStore();
  const [userFilter, setUserFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [oppFilter, setOppFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loading = storeLoading;

  const roleLabel = role === 'administrator' ? 'Administrator' : role === 'sales_leader' ? 'Sales Department' : 'Account Manager';

  const scopedEvents = useMemo(() => {
    if (role === 'sales_leader') return allEvents.filter((e) => e.department === userDept);
    if (role === 'account_manager') {
      const userName = user?.name ?? '';
      return allEvents.filter((e) => e.user === userName || e.accountManager === userName);
    }
    return allEvents;
  }, [allEvents, role, userDept, user]);

  const users = useMemo(() => getUniqueUsers(scopedEvents), [scopedEvents]);
  const roles = useMemo(() => getUniqueRoles(scopedEvents), [scopedEvents]);
  const actions = useMemo(() => getUniqueActions(scopedEvents), [scopedEvents]);
  const opportunities = useMemo(() => getUniqueOpportunities(scopedEvents), [scopedEvents]);
  const departments = useMemo(() => getUniqueDepartments(scopedEvents), [scopedEvents]);

  const userOptions: SelectOption[] = [{ value: 'all', label: 'All Users' }, ...users.map((u) => ({ value: u, label: u }))];
  const roleOptions: SelectOption[] = [{ value: 'all', label: 'All Roles' }, ...roles.map((r) => ({ value: r, label: r }))];
  const actionOptions: SelectOption[] = [{ value: 'all', label: 'All Actions' }, ...actions.map((a) => ({ value: a, label: ACTION_LABELS[a] }))];
  const oppOptions: SelectOption[] = [{ value: 'all', label: 'All Leads' }, ...opportunities.map((o) => ({ value: o.id, label: o.label }))];
  const deptOptions: SelectOption[] = [{ value: 'all', label: 'All Departments' }, ...departments.map((d) => ({ value: d, label: d }))];

  const filteredEvents = useMemo(() => {
    return scopedEvents.filter((e) => {
      if (userFilter !== 'all' && e.user !== userFilter) return false;
      if (roleFilter !== 'all' && e.role !== roleFilter) return false;
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (oppFilter !== 'all' && e.opportunityId !== oppFilter) return false;
      if (deptFilter !== 'all' && e.department !== deptFilter) return false;
      if (statusFilter !== 'all' && e.newStatus !== statusFilter && e.previousStatus !== statusFilter) return false;
      if (!matchesDateFilter(e.timestampValue, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = `${e.user} ${e.actionLabel} ${e.company ?? ''} ${e.department ?? ''} ${e.accountManager ?? ''} ${e.reason ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [scopedEvents, userFilter, roleFilter, actionFilter, oppFilter, deptFilter, dateFilter, statusFilter, searchQuery]);

  const hasActiveFilters =
    userFilter !== 'all' || roleFilter !== 'all' || actionFilter !== 'all' || oppFilter !== 'all' ||
    deptFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setUserFilter('all'); setRoleFilter('all'); setActionFilter('all'); setOppFilter('all');
    setDeptFilter('all'); setDateFilter('all'); setStatusFilter('all'); setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Activity"
        description={role === 'sales_leader' ? `Audit trail of actions in ${userDept}.` : role === 'account_manager' ? 'Activity history for your assigned opportunities.' : 'Complete audit trail of every action across the lead intelligence platform.'}
        breadcrumb={<Breadcrumb items={[{ label: roleLabel }, { label: 'Activity' }]} />}
      />

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" iconLeft={<X className="h-3.5 w-3.5" />} onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={userFilter} onChange={setUserFilter} options={userOptions} placeholder="All Users" ariaLabel="Filter by user" />
          <Select value={roleFilter} onChange={setRoleFilter} options={roleOptions} placeholder="All Roles" ariaLabel="Filter by role" />
          <Select value={actionFilter} onChange={setActionFilter} options={actionOptions} placeholder="All Actions" ariaLabel="Filter by action" />
          <Select value={oppFilter} onChange={setOppFilter} options={oppOptions} placeholder="All Leads" ariaLabel="Filter by lead" />
          <Select value={deptFilter} onChange={setDeptFilter} options={deptOptions} placeholder="All Departments" ariaLabel="Filter by department" />
          <Select value={dateFilter} onChange={(v) => setDateFilter(v as DateFilter)} options={DATE_FILTER_OPTIONS} placeholder="All Dates" ariaLabel="Filter by date" />
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="All Statuses" ariaLabel="Filter by status" />
          <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClear={() => setSearchQuery('')} placeholder="Search activity..." aria-label="Search activity" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader
            title="Audit Trail"
            description={`${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'}${hasActiveFilters ? ' (filtered)' : ' total'}`}
            icon={<ActivityIcon className="h-4 w-4" />}
          />
        </CardHeader>
        <CardContent>
          {filteredEvents.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredEvents.map((event) => (
                <AuditRow key={event.id} event={event} onViewOpportunity={(id) => onSelectOpportunity?.(id)} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title={hasActiveFilters ? 'No matching activity' : 'No activity yet'}
              description={hasActiveFilters ? 'Try adjusting your filters to see more results.' : 'Actions performed by users will appear here as they occur.'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
