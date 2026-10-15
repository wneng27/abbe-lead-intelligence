import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Table,
  type Column,
  Breadcrumb,
  SearchInput,
  Select,
  type SelectOption,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  IntelligenceIndicator,

  Avatar,
  Pagination,
} from '@/components/ui';
import {
  Briefcase,
  LayoutGrid,
  List,
  Eye,
  Filter,
  X,
  CircleDot,
  Layers,
  ClipboardList,
  CheckCircle2,
  Trophy,
  ShieldX,
  AlertCircle,
  Clock,
  Inbox,
  Undo2,
  Send,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import {
  PRIORITY_LABELS,
  PRIORITY_SHORT,
  type Opportunity,
  type Priority,
} from '@/lib/opportunities';
import type { Status, AssessmentLevel } from '@/lib/tokens';
import type { Role } from '@/lib/navigation';
import { SlaCompactPill, SlaBadge, getSlaStatus } from '@/components/ui';
import { formatSlaTimestamp, type SlaStageData } from '@/lib/sla';

/* ─── Types ─── */

interface FilterState {
  search: string;
  priority: string;
  fit: string;
  person: string;
  timing: string;
  status: string;
  department: string;
  salesLeader: string;
  accountManager: string;
  dateDiscovered: string;
  sla: string;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  priority: '',
  fit: '',
  person: '',
  timing: '',
  status: '',
  department: '',
  salesLeader: '',
  accountManager: '',
  dateDiscovered: '',
  sla: '',
};

type ViewMode = 'table' | 'cards';

/* ─── Workflow tabs (role-specific) ─── */

export type WorkflowTabKey =
  | 'all'
  | 'new'
  | 'awaiting_routing'
  | 'assigned'
  | 'in_review'
  | 'returned'
  | 'ready_for_decision'
  | 'nominated'
  | 'not_nominatable'
  | 'sla_attention'
  | 'needs_assignment'
  | 'needs_review'
  | 'submitted';

interface WorkflowTabConfig {
  key: WorkflowTabKey;
  label: string;
  icon: React.ReactNode;
  statuses: Status[] | null;
  unassignedOnly?: boolean;
  slaAttentionOnly?: boolean;
}

const TAB_DESCRIPTIONS: Record<WorkflowTabKey, string> = {
  all: 'All opportunities in the pipeline. Use the filters below to narrow by department, priority, screening, or SLA.',
  new: 'Newly discovered from research sources. Awaiting assignment to a sales department.',
  awaiting_routing: 'Assigned to a sales department. Awaiting acknowledgment and routing by the Sales Department lead.',
  assigned: 'Routed to an Account Manager. Screening review is pending.',
  in_review: 'Account Manager is currently reviewing the screening assessment.',
  returned: 'Opportunities returned for additional checking. Review the reason and monitor re-screening.',
  ready_for_decision: 'Account Manager review complete. Ready for Administrator decision on CRM nomination.',
  nominated: 'Nominated to the ABBE CRM. The screening workflow is complete.',
  not_nominatable: 'The Administrator has determined this opportunity is not eligible for CRM nomination.',
  sla_attention: 'Opportunities with breached or approaching SLA deadlines. Immediate action may be required.',
  needs_assignment: 'Opportunities in your department awaiting Account Manager assignment.',
  needs_review: 'Opportunities assigned to you that require your review.',
  submitted: 'Opportunities you have submitted for nomination to the CRM.',
};

const ADMIN_TABS: WorkflowTabConfig[] = [
  { key: 'all', label: 'All', icon: <Layers className="h-3.5 w-3.5" />, statuses: null },
  { key: 'new', label: 'New', icon: <CircleDot className="h-3.5 w-3.5" />, statuses: ['new'] },
  { key: 'awaiting_routing', label: 'Awaiting Routing', icon: <ClipboardList className="h-3.5 w-3.5" />, statuses: ['assigned_to_dept', 'dept_viewed'] },
  { key: 'assigned', label: 'Assigned', icon: <ArrowRight className="h-3.5 w-3.5" />, statuses: ['assigned_to_am'] },
  { key: 'in_review', label: 'In Review', icon: <Eye className="h-3.5 w-3.5" />, statuses: ['in_review'] },
  { key: 'returned', label: 'Returned', icon: <Undo2 className="h-3.5 w-3.5" />, statuses: ['returned_for_review'] },
  { key: 'ready_for_decision', label: 'Ready for Decision', icon: <CheckCircle2 className="h-3.5 w-3.5" />, statuses: ['reviewed', 'ready_for_admin'] },
  { key: 'nominated', label: 'Nominated', icon: <Trophy className="h-3.5 w-3.5" />, statuses: ['nominated'] },
  { key: 'not_nominatable', label: 'Not Nominatable', icon: <ShieldX className="h-3.5 w-3.5" />, statuses: ['not_nominatable'] },
  { key: 'sla_attention', label: 'SLA Attention', icon: <AlertCircle className="h-3.5 w-3.5" />, statuses: null, slaAttentionOnly: true },
];

const SALES_LEADER_TABS: WorkflowTabConfig[] = [
  { key: 'all', label: 'All', icon: <Layers className="h-3.5 w-3.5" />, statuses: null },
  { key: 'needs_assignment', label: 'Needs Assignment', icon: <ClipboardList className="h-3.5 w-3.5" />, statuses: ['assigned_to_dept', 'new', 'dept_viewed'], unassignedOnly: true },
  { key: 'in_review', label: 'In Review', icon: <Eye className="h-3.5 w-3.5" />, statuses: ['in_review'] },
  { key: 'returned', label: 'Returned', icon: <Undo2 className="h-3.5 w-3.5" />, statuses: ['returned_for_review'] },
  { key: 'ready_for_decision', label: 'Ready for Decision', icon: <CheckCircle2 className="h-3.5 w-3.5" />, statuses: ['reviewed', 'ready_for_admin'] },
];

const ACCOUNT_MANAGER_TABS: WorkflowTabConfig[] = [
  { key: 'all', label: 'All', icon: <Layers className="h-3.5 w-3.5" />, statuses: null },
  { key: 'needs_review', label: 'Needs Review', icon: <Inbox className="h-3.5 w-3.5" />, statuses: ['dept_viewed', 'returned_for_review'] },
  { key: 'in_review', label: 'In Review', icon: <Eye className="h-3.5 w-3.5" />, statuses: ['in_review'] },
  { key: 'submitted', label: 'Submitted', icon: <Send className="h-3.5 w-3.5" />, statuses: ['reviewed', 'ready_for_admin', 'nominated'] },
];

function getTabsForRole(role: Role): WorkflowTabConfig[] {
  if (role === 'administrator') return ADMIN_TABS;
  if (role === 'sales_leader') return SALES_LEADER_TABS;
  return ACCOUNT_MANAGER_TABS;
}

/* ─── Legacy PhaseKey re-export for AdminDashboard compatibility ─── */

export type PhaseKey = WorkflowTabKey;

/* ─── Filter options ─── */

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'P1', label: 'P1 — High Priority' },
  { value: 'P2', label: 'P2 — Medium Priority' },
  { value: 'P3', label: 'P3 — Lower Priority' },
];

const ASSESSMENT_OPTIONS: SelectOption[] = [
  { value: 'strong', label: 'Strong' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'weak', label: 'Weak' },
  { value: 'unknown', label: 'Unknown' },
];

const TIMING_OPTIONS: SelectOption[] = [
  { value: 'Recent Trigger', label: 'Recent Trigger' },
  { value: 'Upcoming Event', label: 'Upcoming Event' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Stale', label: 'Stale' },
  { value: 'Unknown', label: 'Unknown' },
];

const STATUS_OPTIONS: SelectOption[] = [
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

const SLA_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'SLA Active' },
  { value: 'approaching', label: 'SLA Approaching' },
  { value: 'due_soon', label: 'SLA Due Soon' },
  { value: 'breached', label: 'SLA Breached' },
  { value: 'completed', label: 'SLA Completed' },
  { value: 'not_started', label: 'SLA Not Started' },
];

const DATE_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'older', label: 'Older' },
];

/* ─── Priority badge ─── */

function PriorityBadge({ priority }: { priority: Priority }) {
  const isP1 = priority === 'P1';
  return (
    <Badge
      variant={isP1 ? 'gold' : 'outline'}
      size="sm"
      dot
      dotClass={isP1 ? 'bg-gold' : 'bg-muted-foreground'}
    >
      {PRIORITY_SHORT[priority]}
    </Badge>
  );
}

/* ─── Compact indicator ─── */

function CompactIndicator({
  label,
  value,
  level,
}: {
  label: string;
  value: string;
  level: AssessmentLevel;
}) {
  const colorMap: Record<AssessmentLevel, string> = {
    strong: 'text-success',
    moderate: 'text-ink-600 dark:text-ink-200',
    weak: 'text-risk',
    unknown: 'text-muted-foreground',
  };
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-medium truncate', colorMap[level])}>{value}</span>
    </div>
  );
}

/* ─── Person cell (name + role + verification badge) ─── */

const PERSON_BADGE_CLASS: Record<string, string> = {
  Verified: 'bg-success/10 text-success border-success/20',
  Identified: 'bg-ink-50 text-ink-600 dark:bg-ink-600/40 dark:text-ink-200 border-ink-200 dark:border-ink-500',
  Partial: 'bg-risk/10 text-risk border-risk/20',
  Unknown: 'bg-muted text-muted-foreground border-border',
};

function PersonCell({ opp }: { opp: Opportunity }) {
  const hasContact = opp.contactName && opp.contactName.trim().length > 0;
  const badgeClass = PERSON_BADGE_CLASS[opp.personLabel] ?? PERSON_BADGE_CLASS.Unknown;

  return (
    <div className="flex flex-col gap-0.5 min-w-0 max-w-[160px]">
      {hasContact ? (
        <>
          <span className="text-xs font-medium text-foreground truncate">{opp.contactName}</span>
          {opp.contactRole && (
            <span className="text-2xs text-muted-foreground truncate">{opp.contactRole}</span>
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground italic">No contact identified</span>
      )}
      <span className={cn('inline-flex items-center w-fit px-1.5 py-0.5 rounded text-2xs font-semibold border', badgeClass)}>
        {opp.personLabel}
      </span>
    </div>
  );
}

/* ─── Row actions ─── */

function RowActions({ oppId, onView }: { oppId: string; onView?: (id: string) => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      iconLeft={<Eye className="h-3.5 w-3.5" />}
      onClick={(e) => { e.stopPropagation(); onView?.(oppId); }}
    >
      View
    </Button>
  );
}

/* ─── Skeleton rows ─── */

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonTable() {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Card view ─── */

function getAssignmentDate(opp: Opportunity): string | null {
  const reviewStage: SlaStageData | null = opp.sla.review.assignedAt ? opp.sla.review : null;
  const deptStage: SlaStageData | null = opp.sla.department.assignedAt ? opp.sla.department : null;
  if (reviewStage?.assignedAt) return reviewStage.assignedAt;
  if (deptStage?.assignedAt) return deptStage.assignedAt;
  return null;
}

function getDeadline(opp: Opportunity): string | null {
  const slaStatus = getSlaStatus(opp.sla, opp.status);
  return slaStatus.activeStageData?.deadline ?? null;
}

function OpportunityCard({ opp, role, onSelectOpportunity, getAccountManagerName }: { opp: Opportunity; role: Role; onSelectOpportunity?: (id: string) => void; getAccountManagerName: (email: string | null) => string | null }) {
  const amName = opp.accountManager ? getAccountManagerName(opp.accountManager) ?? 'Unassigned' : 'Unassigned';
  const slaStatus = getSlaStatus(opp.sla, opp.status);
  const assignmentDate = getAssignmentDate(opp);
  const deadline = getDeadline(opp);
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{opp.company}</span>
          <span className="text-xs text-muted-foreground truncate">{opp.title}</span>
        </div>
        <PriorityBadge priority={opp.priority} />
      </div>
      <div className="flex items-center gap-3">
        <CompactIndicator label="FIT" value={opp.fitLabel} level={opp.fit} />
        <span className="text-muted-foreground/50">·</span>
        <CompactIndicator label="TIMING" value={opp.timingLabel} level={opp.timing} />
        {opp.totalScore !== null && opp.totalScore !== undefined && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Score</span>
              <span className={cn(
                'text-xs font-bold tabular-nums',
                opp.totalScore >= 80 ? 'text-success' : opp.totalScore >= 50 ? 'text-warning' : 'text-critical'
              )}>{opp.totalScore}/100</span>
            </div>
          </>
        )}
      </div>
      {(opp.contactName || opp.personLabel !== 'Unknown') && (
        <div className="flex items-center gap-2 flex-wrap">
          {opp.contactName ? (
            <span className="text-xs font-medium text-foreground">{opp.contactName}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic">No contact identified</span>
          )}
          {opp.contactRole && (
            <span className="text-2xs text-muted-foreground">{opp.contactRole}</span>
          )}
          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold border', PERSON_BADGE_CLASS[opp.personLabel] ?? PERSON_BADGE_CLASS.Unknown)}>
            {opp.personLabel}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={opp.status} size="sm" />
        <SlaBadge state={slaStatus.currentState} size="sm" />
      </div>
      {/* Assignment metadata */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned To</span>
          <span className="text-xs font-medium text-foreground truncate">{amName}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Department</span>
          <span className="text-xs font-medium text-foreground truncate">{opp.department}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment Date</span>
          <span className="text-xs font-medium text-foreground tabular-nums">{assignmentDate ? formatSlaTimestamp(assignmentDate) : '—'}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Deadline</span>
          <span className="text-xs font-medium text-foreground tabular-nums">{deadline ? formatSlaTimestamp(deadline) : '—'}</span>
        </div>
      </div>
      {/* Time remaining */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Time Remaining</span>
        <SlaCompactPill status={slaStatus} />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <span className="text-2xs text-muted-foreground">{opp.lastUpdated}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Click to view
        </span>
      </div>
    </Card>
  );
}

/* ─── Filter bar ─── */

function FilterBar({
  filters,
  setFilters,
  onClear,
  showAdminFilters,
  departmentOptions,
  accountManagerOptions,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onClear: () => void;
  showAdminFilters: boolean;
  departmentOptions: SelectOption[];
  accountManagerOptions: SelectOption[];
}) {
  const update = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== 'search' && v);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex-1 min-w-0">
          <SearchInput
            value={filters.search}
            onClear={() => update('search', '')}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Search by company, opportunity, or contact..."
            aria-label="Search opportunities"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <Select
            value={filters.priority}
            onChange={(v) => update('priority', v)}
            options={PRIORITY_OPTIONS}
            placeholder="Priority"
            ariaLabel="Filter by priority"
          />
          <Select
            value={filters.fit}
            onChange={(v) => update('fit', v)}
            options={ASSESSMENT_OPTIONS}
            placeholder="FIT"
            ariaLabel="Filter by FIT assessment"
          />
          <Select
            value={filters.person}
            onChange={(v) => update('person', v)}
            options={ASSESSMENT_OPTIONS}
            placeholder="PERSON"
            ariaLabel="Filter by PERSON assessment"
          />
          <Select
            value={filters.timing}
            onChange={(v) => update('timing', v)}
            options={TIMING_OPTIONS}
            placeholder="TIMING"
            ariaLabel="Filter by TIMING assessment"
          />
          <Select
            value={filters.sla}
            onChange={(v) => update('sla', v)}
            options={SLA_OPTIONS}
            placeholder="SLA"
            ariaLabel="Filter by SLA status"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {showAdminFilters && (
            <Select
              value={filters.department}
              onChange={(v) => update('department', v)}
              options={departmentOptions}
              placeholder="Department"
              ariaLabel="Filter by department"
            />
          )}
          <Select
            value={filters.accountManager}
            onChange={(v) => update('accountManager', v)}
            options={accountManagerOptions}
            placeholder="Account Manager"
            ariaLabel="Filter by account manager"
          />
          <Select
            value={filters.dateDiscovered}
            onChange={(v) => update('dateDiscovered', v)}
            options={DATE_OPTIONS}
            placeholder="Date Discovered"
            ariaLabel="Filter by date discovered"
          />
        </div>
        {hasActiveFilters && (
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" iconLeft={<X className="h-3.5 w-3.5" />} onClick={onClear}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Workflow tab bar ─── */

function WorkflowTabBar({ tabs, activeTab, onTabChange, tabCounts }: { tabs: WorkflowTabConfig[]; activeTab: WorkflowTabKey; onTabChange: (tab: WorkflowTabKey) => void; tabCounts: Record<WorkflowTabKey, number> }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = tabCounts[tab.key] ?? 0;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-gold/40 bg-gold/10 text-ink-900 dark:text-gold'
                : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-ink-200 dark:hover:border-ink-500'
            )}
          >
            <span className={cn('shrink-0', isActive ? 'text-gold dark:text-gold' : 'text-muted-foreground')}>
              {tab.icon}
            </span>
            {tab.label}
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-2xs font-bold tabular-nums',
                isActive ? 'bg-gold/20 text-ink-900 dark:text-gold' : 'bg-secondary text-muted-foreground'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main page ─── */

export function OpportunitiesPage({
  pageLabel,
  initialTab,
  onSelectOpportunity,
}: {
  pageLabel: string;
  initialTab?: WorkflowTabKey;
  onSelectOpportunity?: (id: string) => void;
}) {
  const { user } = useAuth();
  const role = user!.role;
  const { getOpportunities, loading, getAccountManagerName, getDepartmentNames, getAccountManagerOptions } = useStore();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const tabs = getTabsForRole(role);
  const [activeTab, setActiveTab] = useState<WorkflowTabKey>(initialTab ?? 'all');
  const pageSize = 10;

  // Apply role-based default filters on mount
  useEffect(() => {
    const defaults = { ...DEFAULT_FILTERS };
    if (role === 'sales_leader') {
      const dept = user!.department ?? '';
      defaults.department = dept;
    } else if (role === 'account_manager') {
      defaults.accountManager = user!.email;
    }
    setFilters(defaults);
  }, [role, user]);

  // Compute role-scoped opportunities (before tab/filter, for tab counts)
  const roleScoped = useMemo(() => {
    let result = [...getOpportunities()];
    if (role === 'sales_leader') {
      const dept = user!.department ?? '';
      result = result.filter((o) => o.department === dept);
    } else if (role === 'account_manager') {
      result = result.filter((o) => o.accountManager === user!.email);
    }
    return result;
  }, [role, user, getOpportunities]);

  // Compute tab counts from the role-scoped set
  const tabCounts = useMemo(() => {
    const counts = {} as Record<WorkflowTabKey, number>;
    for (const tab of tabs) {
      if (tab.slaAttentionOnly) {
        counts[tab.key] = roleScoped.filter((o) => {
          const slaStatus = getSlaStatus(o.sla, o.status);
          return slaStatus.currentState === 'breached' || slaStatus.currentState === 'due_soon';
        }).length;
      } else if (tab.statuses === null) {
        counts[tab.key] = roleScoped.length;
      } else {
        let result = roleScoped.filter((o) => tab.statuses!.includes(o.status));
        if (tab.unassignedOnly) {
          result = result.filter((o) => !o.accountManager);
        }
        counts[tab.key] = result.length;
      }
    }
    return counts;
  }, [roleScoped, tabs]);

  // Apply active tab filter
  const tabScoped = useMemo(() => {
    const tabConf = tabs.find((t) => t.key === activeTab);
    if (!tabConf) return roleScoped;
    if (tabConf.slaAttentionOnly) {
      return roleScoped.filter((o) => {
        const slaStatus = getSlaStatus(o.sla, o.status);
        return slaStatus.currentState === 'breached' || slaStatus.currentState === 'due_soon';
      });
    }
    if (tabConf.statuses === null) return roleScoped;
    let result = roleScoped.filter((o) => tabConf.statuses!.includes(o.status));
    if (tabConf.unassignedOnly) {
      result = result.filter((o) => !o.accountManager);
    }
    return result;
  }, [roleScoped, tabs, activeTab]);

  const filtered = useMemo(() => {
    let result = [...tabScoped];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.company.toLowerCase().includes(q) ||
          o.title.toLowerCase().includes(q) ||
          (o.contactName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filters.priority) result = result.filter((o) => o.priority === filters.priority);
    if (filters.fit) result = result.filter((o) => o.fit === filters.fit);
    if (filters.person) result = result.filter((o) => o.person === filters.person);
    if (filters.timing) result = result.filter((o) => o.timingLabel === filters.timing);
    if (filters.status) result = result.filter((o) => o.status === filters.status);
    if (filters.department) result = result.filter((o) => o.department === filters.department);
    if (filters.accountManager) result = result.filter((o) => o.accountManager === filters.accountManager);
    if (filters.sla) {
      result = result.filter((o) => {
        const slaStatus = getSlaStatus(o.sla, o.status);
        return slaStatus.currentState === filters.sla;
      });
    }
    if (filters.dateDiscovered) {
      const now = new Date();
      result = result.filter((o) => {
        const d = new Date(o.discoveredDate);
        const diff = now.getTime() - d.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (filters.dateDiscovered === 'today') return days < 1;
        if (filters.dateDiscovered === 'week') return days < 7;
        if (filters.dateDiscovered === 'month') return days < 30;
        if (filters.dateDiscovered === 'older') return days >= 30;
        return true;
      });
    }

    return result;
  }, [filters, tabScoped]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleClear = () => {
    const defaults = { ...DEFAULT_FILTERS };
    if (role === 'sales_leader') {
      defaults.department = user!.department ?? '';
    } else if (role === 'account_manager') {
      defaults.accountManager = user!.email;
    }
    setFilters(defaults);
    setPage(1);
    setActiveTab('all');
  };

  const showAdminFilters = role === 'administrator';

  const departmentOptions: SelectOption[] = useMemo(() =>
    getDepartmentNames().map((d) => ({ value: d, label: d })),
    [getDepartmentNames],
  );

  const accountManagerOptions: SelectOption[] = useMemo(() =>
    getAccountManagerOptions().map((am) => ({ value: am.email, label: am.name })),
    [getAccountManagerOptions],
  );

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'company',
      header: 'Company',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <span className="font-medium text-foreground">{r.company}</span>;
      },
    },
    {
      key: 'opportunity',
      header: 'Opportunity',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <span className="text-sm text-muted-foreground truncate max-w-[180px] block">{r.title}</span>;
      },
    },
    {
      key: 'fit',
      header: 'FIT',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <CompactIndicator label="FIT" value={r.fitLabel} level={r.fit} />;
      },
    },
    {
      key: 'person',
      header: 'Person',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <PersonCell opp={r} />;
      },
    },
    {
      key: 'timing',
      header: 'TIMING',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <CompactIndicator label="TIMING" value={r.timingLabel} level={r.timing} />;
      },
    },
    {
      key: 'totalScore',
      header: 'Score',
      render: (row) => {
        const r = row as unknown as Opportunity;
        if (r.totalScore === null || r.totalScore === undefined) {
          return <span className="text-xs text-muted-foreground italic">—</span>;
        }
        const pct = Math.round((r.totalScore / 100) * 100);
        const colorClass = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-critical';
        return (
          <div className="flex flex-col gap-0.5">
            <span className={cn('text-sm font-bold tabular-nums', colorClass)}>{r.totalScore}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
            {r.aiConfidence && (
              <span className={cn(
                'text-2xs font-medium uppercase tracking-wide',
                r.aiConfidence === 'high' ? 'text-success' : r.aiConfidence === 'medium' ? 'text-warning' : 'text-muted-foreground'
              )}>
                AI: {r.aiConfidence}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <PriorityBadge priority={r.priority} />;
      },
    },
    ...(showAdminFilters ? [{
      key: 'department' as const,
      header: 'Department',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as Opportunity;
        return <span className="text-xs text-foreground">{r.department}</span>;
      },
    }] : []),
    {
      key: 'accountManager',
      header: 'Assigned To',
      render: (row) => {
        const r = row as unknown as Opportunity;
        if (!r.accountManager) {
          return (
            <Badge variant="outline" size="sm">
              Unassigned
            </Badge>
          );
        }
        const name = getAccountManagerName(r.accountManager) ?? r.accountManager;
        return (
          <div className="flex items-center gap-2">
            <Avatar name={name} size="sm" />
            <span className="text-xs text-foreground">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'assignmentDate',
      header: 'Assigned',
      render: (row) => {
        const r = row as unknown as Opportunity;
        const date = getAssignmentDate(r);
        return <span className="text-xs text-muted-foreground tabular-nums">{date ? formatSlaTimestamp(date) : '—'}</span>;
      },
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (row) => {
        const r = row as unknown as Opportunity;
        const dl = getDeadline(r);
        return <span className="text-xs text-muted-foreground tabular-nums">{dl ? formatSlaTimestamp(dl) : '—'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <StatusBadge status={r.status} size="sm" shortLabel />;
      },
    },
    {
      key: 'sla',
      header: 'SLA',
      render: (row) => {
        const r = row as unknown as Opportunity;
        const slaStatus = getSlaStatus(r.sla, r.status);
        return (
          <div className="flex flex-col gap-1">
            <SlaBadge state={slaStatus.currentState} size="sm" />
            <SlaCompactPill status={slaStatus} />
          </div>
        );
      },
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <span className="text-xs text-muted-foreground tabular-nums">{r.lastUpdated}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return <RowActions oppId={r.id} onView={onSelectOpportunity} />;
      },
    },
  ];

  const breadcrumbLabel = role === 'administrator' ? 'Administrator' : role === 'sales_leader' ? 'Sales Department' : 'Account Manager';

  const pageDescription = role === 'administrator'
    ? 'All discovered and tracked business opportunities in the pre-CRM pipeline.'
    : role === 'sales_leader'
      ? 'Opportunities in your department. Use the workflow tabs to filter by stage.'
      : 'Opportunities assigned to you for screening and review. Use the workflow tabs to filter by stage.';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={pageLabel}
        description={pageDescription}
        breadcrumb={
          <Breadcrumb items={[{ label: breadcrumbLabel }, { label: pageLabel }]} />
        }
      />

      {/* Workflow tabs */}
      <WorkflowTabBar tabs={tabs} activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setPage(1); }} tabCounts={tabCounts} />
      <p className="text-xs text-muted-foreground leading-relaxed">{TAB_DESCRIPTIONS[activeTab]}</p>

      {/* Filter bar */}
      <FilterBar filters={filters} setFilters={setFilters} onClear={handleClear} showAdminFilters={showAdminFilters} departmentOptions={departmentOptions} accountManagerOptions={accountManagerOptions} />

      {/* View toggle + count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> opportunit{filtered.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setViewMode('table')}
            aria-label="Table view"
            aria-pressed={viewMode === 'table'}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              viewMode === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            aria-label="Card view"
            aria-pressed={viewMode === 'cards'}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              viewMode === 'cards' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <Card>
          <ErrorState
            title="Failed to load opportunities"
            description="We couldn't retrieve the opportunity list. Please try again."
            onRetry={() => {
              setError(false);
            }}
          />
        </Card>
      ) : loading ? (
        <Card>
          <SkeletonTable />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Filter className="h-6 w-6" />}
            title="No opportunities match your current filters."
            description="Try adjusting or clearing your filters to see more results."
            action={
              <Button variant="outline" size="sm" iconLeft={<X className="h-3.5 w-3.5" />} onClick={handleClear}>
                Clear Filters
              </Button>
            }
          />
        </Card>
      ) : viewMode === 'table' ? (
        <>
          <Card>
            <Table
              columns={columns}
              data={paged as unknown as Record<string, unknown>[]}
              rowKey={(row) => (row as unknown as Opportunity).id}
              onRowClick={(row) => onSelectOpportunity?.((row as unknown as Opportunity).id)}
            />
          </Card>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={pageSize}
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((opp) => (
              <div key={opp.id} onClick={() => onSelectOpportunity?.(opp.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectOpportunity?.(opp.id); } }} role="button" tabIndex={0} className="cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <OpportunityCard opp={opp} role={role} onSelectOpportunity={onSelectOpportunity} getAccountManagerName={getAccountManagerName} />
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
}
