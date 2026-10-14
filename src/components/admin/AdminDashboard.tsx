import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  Button,
  Breadcrumb,
  Skeleton,
  SkeletonCard,
} from '@/components/ui';
import {
  Briefcase,
  ClipboardList,
  Eye,
  Trophy,
  ArrowRight,
  Building2,
  KeyRound,
  Activity,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  CircleDot,
  ShieldX,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import type { Status } from '@/lib/tokens';
import type { WorkflowTabKey } from './OpportunitiesPage';
import { getSlaStatus } from '@/lib/sla';

/* ─── Summary indicator config ─── */

interface SummaryIndicator {
  key: WorkflowTabKey;
  label: string;
  icon: React.ReactNode;
  statuses: Status[];
  description: string;
  highlightOnCount?: boolean;
  alertOnCount?: boolean;
}

const SUMMARY_INDICATORS: SummaryIndicator[] = [
  {
    key: 'new',
    label: 'New Opportunities',
    icon: <CircleDot className="h-5 w-5" />,
    statuses: ['new'],
    description: 'Newly discovered, awaiting routing to a sales department',
    highlightOnCount: true,
  },
  {
    key: 'awaiting_routing',
    label: 'Awaiting Routing',
    icon: <ClipboardList className="h-5 w-5" />,
    statuses: ['assigned_to_dept', 'dept_viewed'],
    description: 'Assigned to a department, awaiting acknowledgment and AM assignment',
    highlightOnCount: true,
  },
  {
    key: 'assigned',
    label: 'Assigned',
    icon: <ArrowRight className="h-5 w-5" />,
    statuses: ['assigned_to_am'],
    description: 'Routed to an Account Manager, screening review pending',
  },
  {
    key: 'in_review',
    label: 'In Review',
    icon: <Eye className="h-5 w-5" />,
    statuses: ['in_review'],
    description: 'Account Manager is actively reviewing the screening assessment',
  },
  {
    key: 'ready_for_decision',
    label: 'Ready for Decision',
    icon: <CheckCircle2 className="h-5 w-5" />,
    statuses: ['reviewed', 'ready_for_admin'],
    description: 'Review complete, ready for Administrator nomination decision',
    highlightOnCount: true,
  },
  {
    key: 'nominated',
    label: 'Nominated',
    icon: <Trophy className="h-5 w-5" />,
    statuses: ['nominated'],
    description: 'Nominated to the ABBE CRM — workflow complete',
  },
  {
    key: 'not_nominatable',
    label: 'Not Nominatable',
    icon: <ShieldX className="h-5 w-5" />,
    statuses: ['not_nominatable'],
    description: 'Administrator has determined this is not eligible for CRM nomination',
  },
  {
    key: 'sla_attention',
    label: 'SLA Attention',
    icon: <AlertCircle className="h-5 w-5" />,
    statuses: [],
    description: 'Opportunities with breached or approaching SLA deadlines',
    alertOnCount: true,
  },
];

/* ─── Dashboard skeleton ─── */

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Summary card ─── */

function SummaryCard({
  indicator,
  count,
  onClick,
}: {
  indicator: SummaryIndicator;
  count: number;
  onClick: () => void;
}) {
  const isHighlighted = indicator.highlightOnCount && count > 0;
  const isAlert = indicator.alertOnCount && count > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isAlert
          ? 'border-critical/30 hover:border-critical/50'
          : isHighlighted
            ? 'border-gold/30 hover:border-gold/50'
            : 'border-border hover:border-foreground/20'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
          isAlert
            ? 'bg-critical/10 text-critical dark:text-critical-light'
            : isHighlighted
              ? 'bg-gold/10 text-gold'
              : 'bg-secondary text-muted-foreground'
        )}>
          {indicator.icon}
        </span>
        <span className={cn(
          'text-3xl font-bold tabular-nums',
          isAlert ? 'text-critical dark:text-critical-light' : 'text-foreground'
        )}>
          {count}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{indicator.label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{indicator.description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors pt-1">
        Open in Opportunities
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

/* ─── Main dashboard ─── */

export function AdminDashboard({
  onNavigate,
  onNavigateToTab,
}: {
  onNavigate?: (page: string) => void;
  onNavigateToTab?: (tab: WorkflowTabKey) => void;
}) {
  const { getOpportunities, loading } = useStore();

  const counts = useMemo(() => {
    const allOpps = getOpportunities();
    const result: Record<string, number> = {};

    for (const indicator of SUMMARY_INDICATORS) {
      if (indicator.key === 'sla_attention') {
        result[indicator.key] = allOpps.filter((o) => {
          const slaStatus = getSlaStatus(o.sla, o.status);
          return slaStatus.currentState === 'breached' || slaStatus.currentState === 'due_soon';
        }).length;
      } else {
        result[indicator.key] = allOpps.filter((o) => indicator.statuses.includes(o.status)).length;
      }
    }

    return result;
  }, [getOpportunities]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview of the screening pipeline. Click any indicator to open the filtered opportunities view."
        breadcrumb={
          <Breadcrumb items={[{ label: 'Administrator' }, { label: 'Dashboard' }]} />
        }
      />

      {/* Summary indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_INDICATORS.map((indicator) => (
          <SummaryCard
            key={indicator.key}
            indicator={indicator}
            count={counts[indicator.key] ?? 0}
            onClick={() => onNavigateToTab?.(indicator.key)}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Briefcase className="h-3.5 w-3.5" />}
          onClick={() => onNavigateToTab?.('all')}
        >
          View All Opportunities
        </Button>
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Building2 className="h-3.5 w-3.5" />}
          onClick={() => onNavigate?.('Departments')}
        >
          Manage Departments
        </Button>
        <Button
          variant="outline"
          size="sm"
          iconLeft={<KeyRound className="h-3.5 w-3.5" />}
          onClick={() => onNavigate?.('Users & Access')}
        >
          Users & Access
        </Button>
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Activity className="h-3.5 w-3.5" />}
          onClick={() => onNavigate?.('Activity')}
        >
          View Activity
        </Button>
      </div>
    </div>
  );
}
