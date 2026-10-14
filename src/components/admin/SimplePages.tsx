import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  KPICard,
  Button,
  Badge,
  Breadcrumb,
  SectionHeader,
  EmptyState,
  Skeleton,
  SkeletonCard,
  Avatar,
  Table,
  type Column,
} from '@/components/ui';
import {
  Briefcase,
  ClipboardList,
  Eye,
  Trophy,
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Activity as ActivityIcon,
  Users as UsersIcon,
  Undo2,
  Send,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { WorkflowTabKey } from './OpportunitiesPage';
import { useStore, type ActivityEntry } from '@/lib/store';
import {
  type Opportunity,
} from '@/lib/opportunities';
import type { Role } from '@/lib/navigation';
import { SlaBadge, SlaCompactPill, getSlaStatus } from '@/components/ui';
import { formatSlaTimestamp, type SlaStageData } from '@/lib/sla';

/* ─── Activity Page (re-exported from ActivityPage.tsx) ─── */

export { ActivityPage } from './ActivityPage';

/* ─── Simple activity data for dashboard sidebar ─── */

interface SimpleActivityEntry {
  id: string;
  user: string;
  action: string;
  opportunity: string;
  timestamp: string;
  icon: React.ReactNode;
}

function storeEntryToSimpleActivity(entry: ActivityEntry): SimpleActivityEntry {
  const lower = entry.action.toLowerCase();
  let icon: React.ReactNode = <ActivityIcon className="h-3.5 w-3.5" />;
  if (lower.includes('assigned') || lower.includes('routed') || lower.includes('reassigned')) {
    icon = <ArrowRight className="h-3.5 w-3.5" />;
  } else if (lower.includes('review') && lower.includes('started')) {
    icon = <Eye className="h-3.5 w-3.5" />;
  } else if (lower.includes('submitted') || lower.includes('nominated')) {
    icon = <Trophy className="h-3.5 w-3.5" />;
  } else if (lower.includes('returned')) {
    icon = <AlertCircle className="h-3.5 w-3.5" />;
  } else if (lower.includes('review') && lower.includes('saved')) {
    icon = <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  return {
    id: entry.id,
    user: entry.user,
    action: lower.includes('assigned to') ? 'assigned an opportunity to'
      : lower.includes('routed to') ? 'routed an opportunity to'
      : lower.includes('reassigned') ? 'reassigned an opportunity from'
      : lower.includes('review started') ? 'started review of'
      : lower.includes('review saved') ? 'saved review of'
      : lower.includes('submitted as reviewed') ? 'submitted for nomination:'
      : lower.includes('returned for review') ? 'returned for additional checking:'
      : lower.includes('nominated') ? 'nominated for CRM:'
      : 'performed action on',
    opportunity: `${entry.company}`,
    timestamp: entry.timestamp,
    icon,
  };
}

function SimpleActivityRow({ entry }: { entry: SimpleActivityEntry }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground shrink-0 mt-0.5">
        {entry.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold">{entry.user}</span>{' '}
          <span className="text-muted-foreground">{entry.action}</span>{' '}
          <span className="font-medium">{entry.opportunity}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{entry.timestamp}</p>
      </div>
    </div>
  );
}

/* ─── Team Page (Sales Leader) ─── */

interface TeamMemberRow {
  name: string;
  email: string;
  role: string;
  assignedCount: number;
  inReviewCount: number;
  returnedCount: number;
  readyCount: number;
  submittedCount: number;
  slaAttentionCount: number;
}

export function TeamPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const { getOpportunities, loading, getAccountManagersInDept, getAccountManagerName } = useStore();
  const dept = user?.department ?? '';

  const teamMembers: TeamMemberRow[] = getAccountManagersInDept(dept).map((am) => {
    const assignedOpps = getOpportunities().filter((o) => o.accountManager === am.email);
    return {
      name: am.name,
      email: am.email,
      role: 'Account Manager',
      assignedCount: assignedOpps.filter((o) => o.status === 'assigned_to_am' || o.status === 'in_review' || o.status === 'returned_for_review' || o.status === 'reviewed' || o.status === 'ready_for_admin').length,
      inReviewCount: assignedOpps.filter((o) => o.status === 'in_review').length,
      returnedCount: assignedOpps.filter((o) => o.status === 'returned_for_review').length,
      readyCount: assignedOpps.filter((o) => o.status === 'reviewed' || o.status === 'ready_for_admin').length,
      submittedCount: assignedOpps.filter((o) => o.status === 'reviewed' || o.status === 'ready_for_admin' || o.status === 'nominated').length,
      slaAttentionCount: assignedOpps.filter((o) => {
        const s = getSlaStatus(o.sla, o.status);
        return s.currentState === 'breached' || s.currentState === 'due_soon';
      }).length,
    };
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Account Manager',
      render: (row) => {
        const r = row as unknown as TeamMemberRow;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={r.name} size="sm" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: () => <Badge variant="default" size="sm">Account Manager</Badge>,
    },
    {
      key: 'assigned',
      header: 'Assigned Opportunities',
      render: (row) => {
        const r = row as unknown as TeamMemberRow;
        return <span className="text-sm font-medium text-foreground tabular-nums">{r.assignedCount}</span>;
      },
    },
    {
      key: 'inReview',
      header: 'In Review',
      render: (row) => {
        const r = row as unknown as TeamMemberRow;
        return <span className="text-sm font-medium text-foreground tabular-nums">{r.inReviewCount}</span>;
      },
    },
    {
      key: 'returned',
      header: 'Returned',
      render: (row) => {
        const r = row as unknown as TeamMemberRow;
        return <span className="text-sm font-medium text-foreground tabular-nums">{r.returnedCount}</span>;
      },
    },
    {
      key: 'submitted',
      header: 'Reviewed/Submitted',
      render: (row) => {
        const r = row as unknown as TeamMemberRow;
        return <span className="text-sm font-medium text-foreground tabular-nums">{r.submittedCount}</span>;
      },
    },
    {
      key: 'slaAttention',
      header: 'SLA Attention',
      render: (row) => {
        const r = row as unknown as TeamMemberRow;
        return (
          <span className={cn('text-sm font-medium tabular-nums', r.slaAttentionCount > 0 ? 'text-critical dark:text-critical-light' : 'text-muted-foreground')}>
            {r.slaAttentionCount}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate?.('Opportunities')}
        >
          View Opportunities
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="View your team members and their current opportunity assignments."
        breadcrumb={
          <Breadcrumb items={[{ label: 'Sales Department' }, { label: 'Team' }]} />
        }
      />

      <Card className="p-5">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">{dept}</p>
            <p className="text-xs text-muted-foreground">{teamMembers.length} Account Manager{teamMembers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Account Managers in your department and their current workload.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {teamMembers.length > 0 ? (
            <Table
              columns={columns}
              data={teamMembers as unknown as Record<string, unknown>[]}
              rowKey={(row) => (row as unknown as TeamMemberRow).email}
            />
          ) : (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title="No team members"
              description="No Account Managers are assigned to your department yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Role Dashboard (Sales Leader & Account Manager) ─── */

interface RoleKPI {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  navTarget?: string;
  navTab?: WorkflowTabKey;
  highlight?: boolean;
  alert?: boolean;
}

function getRoleKPIs(role: Role, dept: string, userEmail: string, opps: Opportunity[]): RoleKPI[] {
  if (role === 'sales_leader') {
    const deptOpps = opps.filter((o) => o.department === dept);
    const slaAttention = deptOpps.filter((o) => {
      const s = getSlaStatus(o.sla, o.status);
      return s.currentState === 'breached' || s.currentState === 'due_soon';
    }).length;
    const teamWorkload = deptOpps.filter((o) => o.accountManager && (o.status === 'assigned_to_am' || o.status === 'in_review')).length;
    return [
      { label: 'Department Opportunities', value: deptOpps.length, icon: <Briefcase className="h-5 w-5" />, description: 'In your department', navTarget: 'Opportunities', navTab: 'all' },
      { label: 'Needs Assignment', value: deptOpps.filter((o) => (o.status === 'assigned_to_dept' || o.status === 'new' || o.status === 'dept_viewed') && !o.accountManager).length, icon: <ClipboardList className="h-5 w-5" />, description: 'Awaiting your assignment', navTarget: 'Opportunities', navTab: 'needs_assignment', highlight: true },
      { label: 'In Review', value: deptOpps.filter((o) => o.status === 'in_review').length, icon: <Eye className="h-5 w-5" />, description: 'Under screening', navTarget: 'Opportunities', navTab: 'in_review' },
      { label: 'Returned', value: deptOpps.filter((o) => o.status === 'returned_for_review').length, icon: <Undo2 className="h-5 w-5" />, description: 'Need additional checking', navTarget: 'Opportunities', navTab: 'returned', alert: true },
      { label: 'Ready for Decision', value: deptOpps.filter((o) => o.status === 'reviewed' || o.status === 'ready_for_admin').length, icon: <CheckCircle2 className="h-5 w-5" />, description: 'Review complete', navTarget: 'Opportunities', navTab: 'ready_for_decision' },
      { label: 'SLA Attention', value: slaAttention, icon: <AlertTriangle className="h-5 w-5" />, description: 'Breached or approaching', navTarget: 'Opportunities', navTab: 'all', alert: true },
      { label: 'Team Workload', value: teamWorkload, icon: <UsersIcon className="h-5 w-5" />, description: 'Active across team', navTarget: 'Team' },
    ];
  }
  // account_manager
  const myOpps = opps.filter((o) => o.accountManager === userEmail);
  const slaAttention = myOpps.filter((o) => {
    const s = getSlaStatus(o.sla, o.status);
    return s.currentState === 'breached' || s.currentState === 'due_soon';
  }).length;
  return [
    { label: 'Assigned Opportunities', value: myOpps.length, icon: <Briefcase className="h-5 w-5" />, description: 'Assigned to me', navTarget: 'My Opportunities', navTab: 'all' },
    { label: 'Needs Review', value: myOpps.filter((o) => o.status === 'assigned_to_am' || o.status === 'dept_viewed' || o.status === 'returned_for_review').length, icon: <ClipboardList className="h-5 w-5" />, description: 'Awaiting my review', navTarget: 'My Opportunities', navTab: 'needs_review', highlight: true },
    { label: 'In Review', value: myOpps.filter((o) => o.status === 'in_review').length, icon: <Eye className="h-5 w-5" />, description: 'Currently reviewing', navTarget: 'My Opportunities', navTab: 'in_review' },
    { label: 'Submitted', value: myOpps.filter((o) => o.status === 'reviewed' || o.status === 'ready_for_admin' || o.status === 'nominated').length, icon: <Send className="h-5 w-5" />, description: 'Review complete', navTarget: 'My Opportunities', navTab: 'submitted' },
    { label: 'SLA Attention', value: slaAttention, icon: <AlertTriangle className="h-5 w-5" />, description: 'Breached or approaching', navTarget: 'My Opportunities', navTab: 'all', alert: true },
  ];
}

export function RoleDashboard({ role, onNavigate, onNavigateToTab, onSelectOpportunity }: { role: Role; onNavigate?: (page: string) => void; onNavigateToTab?: (tab: WorkflowTabKey) => void; onSelectOpportunity?: (id: string) => void }) {
  const { user } = useAuth();
  const { getOpportunities, activityEvents, loading, getAccountManagerName } = useStore();
  const dept = user?.department ?? '';

  const roleLabel = role === 'sales_leader' ? 'Sales Department' : 'Account Manager';

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const allOpps = getOpportunities();
  const kpiData = getRoleKPIs(role, dept, user!.email, allOpps);

  const handleKpiClick = (kpi: RoleKPI) => {
    if (kpi.navTab && kpi.navTarget) {
      onNavigateToTab?.(kpi.navTab);
    }
    if (kpi.navTarget) {
      onNavigate?.(kpi.navTarget);
    }
  };

  // Get top 5 recent opportunities for this role
  const relevantOpps = role === 'sales_leader'
    ? allOpps.filter((o) => o.department === dept)
    : allOpps.filter((o) => o.accountManager === user!.email);

  const recentOpps = [...relevantOpps].slice(0, 5);

  const getAssignmentDate = (opp: Opportunity): string | null => {
    const deptDate = opp.sla.department.assignedAt ?? null;
    const reviewDate = opp.sla.review.assignedAt ?? null;
    if (role === 'sales_leader') return deptDate ?? reviewDate;
    return reviewDate ?? deptDate;
  };

  const getDeadline = (opp: Opportunity): string | null => {
    const slaStatus = getSlaStatus(opp.sla, opp.status);
    if (slaStatus.currentState === 'completed' || slaStatus.activeStage === 'none') return null;
    return slaStatus.activeStageData?.deadline ?? null;
  };

  const getSlaDisplay = (opp: Opportunity) => {
    const slaStatus = getSlaStatus(opp.sla, opp.status);
    if (slaStatus.activeStage === 'none' && slaStatus.currentState !== 'completed') return null;
    return slaStatus;
  };

  const recentColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'company',
      header: 'Company',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{r.company}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{r.title}</span>
          </div>
        );
      },
    },
    {
      key: 'accountManager',
      header: 'Assigned To',
      render: (row) => {
        const r = row as unknown as Opportunity;
        if (!r.accountManager) return <Badge variant="outline" size="sm">Unassigned</Badge>;
        const name = getAccountManagerName(r.accountManager) ?? r.accountManager;
        return (
          <div className="flex items-center gap-1.5">
            <Avatar name={name} size="sm" />
            <span className="text-xs text-foreground">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const r = row as unknown as Opportunity;
        const statusLabels: Record<string, string> = {
          new: 'New', assigned_to_dept: 'Assigned to Sales Department', dept_viewed: 'Department Viewed',
          assigned_to_am: 'Assigned to Account Manager', in_review: 'In Review',
          reviewed: 'Reviewed', ready_for_admin: 'Ready for Administrator Decision',
          returned_for_review: 'Returned for Review', nominated: 'Nominated to CRM',
          not_nominatable: 'Not Nominatable', deferred: 'Deferred',
          sla_breached: 'SLA Breached', reassigned: 'Reassigned', archived: 'Archived',
        };
        return <Badge variant="outline" size="sm">{statusLabels[r.status] ?? r.status}</Badge>;
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
      key: 'sla',
      header: 'SLA',
      render: (row) => {
        const r = row as unknown as Opportunity;
        const slaStatus = getSlaDisplay(r);
        if (!slaStatus) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
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
      header: '',
      align: 'right',
      render: (row) => {
        const r = row as unknown as Opportunity;
        return (
          <Button
            variant="outline"
            size="sm"
            iconLeft={<Eye className="h-3.5 w-3.5" />}
            onClick={() => onSelectOpportunity?.(r.id)}
          >
            View Opportunity
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={role === 'sales_leader'
          ? `Overview of opportunities and screening activity in ${dept}.`
          : 'Overview of your assigned opportunities and review activity.'}
        breadcrumb={
          <Breadcrumb items={[{ label: roleLabel }, { label: 'Dashboard' }]} />
        }
      />

      {/* Needs Attention banner (Sales Department only) */}
      {role === 'sales_leader' && (() => {
        const kpiDataSl = getRoleKPIs(role, dept, user!.email, allOpps);
        const needsAssignment = kpiDataSl.find((k) => k.label === 'Needs Assignment');
        const returned = kpiDataSl.find((k) => k.label === 'Returned');
        const readyForNom = kpiDataSl.find((k) => k.label === 'Ready for Administrator Decision');
        const attentionItems: { label: string; count: number; navTarget: string; icon: React.ReactNode; variant: 'warning' | 'critical' | 'success' }[] = [];
        if (needsAssignment && needsAssignment.value > 0) {
          attentionItems.push({ label: 'opportunities need assignment', count: needsAssignment.value, navTarget: 'Opportunities', icon: <ClipboardList className="h-4 w-4" />, variant: 'warning' });
        }
        if (returned && returned.value > 0) {
          attentionItems.push({ label: 'opportunities returned for additional checking', count: returned.value, navTarget: 'Opportunities', icon: <Undo2 className="h-4 w-4" />, variant: 'critical' });
        }
        if (readyForNom && readyForNom.value > 0) {
          attentionItems.push({ label: 'opportunities ready for administrator decision', count: readyForNom.value, navTarget: 'Opportunities', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'success' });
        }
        if (attentionItems.length === 0) return null;
        return (
          <Card className={cn('border-l-4', attentionItems.some((i) => i.variant === 'critical') ? 'border-l-critical' : attentionItems.some((i) => i.variant === 'warning') ? 'border-l-warning' : 'border-l-success')}>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">Needs Your Attention</p>
              </div>
              <div className="flex flex-col gap-2">
                {attentionItems.map((item) => (
                  <button
                    key={item.navTarget}
                    onClick={() => onNavigate?.(item.navTarget)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 hover:border-ink-200 dark:hover:border-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
                        item.variant === 'critical' && 'bg-critical/10 text-critical dark:text-critical-light',
                        item.variant === 'warning' && 'bg-warning/10 text-warning',
                        item.variant === 'success' && 'bg-success/10 text-success',
                      )}>
                        {item.icon}
                      </span>
                      <p className="text-sm text-foreground">
                        <span className="font-bold tabular-nums">{item.count}</span> {item.label}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* KPI Area */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi) => {
          const k = kpi as { highlight?: boolean; alert?: boolean; navTarget?: string };
          return (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              description={kpi.description}
              className={cn(
                k.highlight && 'border-gold/30 bg-gold/5',
                k.alert && kpi.value > 0 && 'border-critical/30 bg-critical/5',
              )}
              onClick={k.navTarget ? () => handleKpiClick(kpi as RoleKPI) : undefined}
            />
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Briefcase className="h-3.5 w-3.5" />}
          onClick={() => onNavigate?.('Opportunities')}
        >
          View Opportunities
        </Button>
        {role === 'sales_leader' && (
          <>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<UsersIcon className="h-3.5 w-3.5" />}
              onClick={() => onNavigate?.('Team')}
            >
              View Team
            </Button>
          </>
        )}
      </div>

      {/* Recent Opportunities + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionHeader
              title="Recent Opportunities"
              description={role === 'sales_leader' ? 'Latest opportunities in your department.' : 'Latest opportunities assigned to you.'}
              icon={<Briefcase className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent className="p-0">
            {recentOpps.length > 0 ? (
              <Table
                columns={recentColumns}
                data={recentOpps as unknown as Record<string, unknown>[]}
                rowKey={(row) => (row as unknown as Opportunity).id}
                onRowClick={(row) => onSelectOpportunity?.((row as unknown as Opportunity).id)}
              />
            ) : (
              <EmptyState
                icon={<Briefcase className="h-6 w-6" />}
                title={role === 'sales_leader' ? 'No leads assigned to your department' : 'No leads assigned to you'}
                description={role === 'sales_leader'
                  ? 'Opportunities will appear here once they are routed to your department for screening.'
                  : 'Opportunities will appear here once the Sales Department assigns them to you.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Recent Activity"
              description="Latest actions."
              icon={<ActivityIcon className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {activityEvents.length > 0 ? (
                activityEvents.slice(0, 5).map((entry) => (
                  <SimpleActivityRow key={entry.id} entry={storeEntryToSimpleActivity(entry)} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-3">No recent activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
