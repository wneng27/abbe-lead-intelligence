import { cn } from '@/lib/utils';
import {
  Clock,
  Hourglass,
  AlertCircle,
  CheckCircle2,
  Minus,
  Timer,
} from 'lucide-react';
import {
  SLA_STATE_CONFIG,
  STAGE_LABELS,
  getNow,
  formatSlaTimestamp,
  computeSlaState,
  computeTimeRemaining,
  type SlaState,
  type SlaStage,
  type SlaStageData,
  type SlaStatus,
  type SlaWorkflowData,
  type TimeRemaining,
} from '@/lib/sla';
import { Card, CardHeader, CardContent, SectionHeader } from '@/components/ui';

/* ─── Icon mapping ─── */

const STATE_ICONS: Record<SlaState, React.ReactNode> = {
  not_started: <Minus className="h-3.5 w-3.5" />,
  active: <Clock className="h-3.5 w-3.5" />,
  approaching: <Hourglass className="h-3.5 w-3.5" />,
  due_soon: <Hourglass className="h-3.5 w-3.5" />,
  breached: <AlertCircle className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
};

/* ─── SlaBadge: compact badge showing SLA state ─── */

export function SlaBadge({ state, size = 'sm' }: { state: SlaState; size?: 'sm' | 'md' }) {
  const config = SLA_STATE_CONFIG[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs',
        config.badgeClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClass)} />
      {config.label}
    </span>
  );
}

/* ─── SlaTimerInline: inline timer with stage label and time remaining ─── */

export function SlaTimerInline({ status, className }: { status: SlaStatus; className?: string }) {
  const config = SLA_STATE_CONFIG[status.currentState];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', config.textClass, className)}>
      {STATE_ICONS[status.currentState]}
      <span className="truncate">{status.contextLabel}</span>
    </span>
  );
}

/* ─── SlaCompactPill: very compact pill for table rows / card footers ─── */

export function SlaCompactPill({ status }: { status: SlaStatus }) {
  const config = SLA_STATE_CONFIG[status.currentState];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold whitespace-nowrap',
        config.badgeClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClass)} />
      {status.shortLabel}
    </span>
  );
}

/* ─── SlaStageCard: detailed card for a single SLA stage ─── */

export function SlaStageCard({
  stage,
  stageData,
  state,
  timeRemaining,
  isActive,
}: {
  stage: SlaStage;
  stageData: SlaStageData;
  state: SlaState;
  timeRemaining: TimeRemaining;
  isActive: boolean;
}) {
  const config = SLA_STATE_CONFIG[state];
  const label = STAGE_LABELS[stage];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col gap-3 transition-colors',
        config.borderClass,
        config.bgClass,
        isActive && 'ring-1 ring-offset-0',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', config.badgeClass)}>
            {STATE_ICONS[state]}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{label}</span>
            <span className={cn('text-2xs font-semibold uppercase tracking-wide', config.textClass)}>
              {config.label}
            </span>
          </div>
        </div>
        {isActive && (
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wide', config.badgeClass)}>
            <Timer className="h-3 w-3" />
            Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SlaField label="Assigned At" value={formatSlaTimestamp(stageData.assignedAt)} />
        <SlaField label="Deadline" value={formatSlaTimestamp(stageData.deadline)} />
        <SlaField
          label="Time Remaining"
          value={timeRemaining.label}
          valueClass={config.textClass}
        />
      </div>
    </div>
  );
}

function SlaField({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-medium text-foreground tabular-nums', valueClass)}>{value}</span>
    </div>
  );
}

/* ─── SlaWorkflowPanel: full two-stage workflow panel for the detail page ─── */

export function SlaWorkflowPanel({
  workflow,
  status,
}: {
  workflow: SlaWorkflowData;
  status: SlaStatus;
}) {
  // Department stage: completed once AM is assigned (completedAt set), active while acknowledged but unassigned
  const deptState: SlaState = workflow.department.completedAt
    ? 'completed'
    : workflow.department.assignedAt
      ? computeSlaState(workflow.department, getNow())
      : 'not_started';

  const deptTimeRemaining: TimeRemaining = workflow.department.completedAt
    ? { ms: 0, label: 'Completed', isOverdue: false, hours: 0, minutes: 0 }
    : workflow.department.deadline
      ? computeTimeRemaining(workflow.department.deadline, getNow())
      : { ms: 0, label: '—', isOverdue: false, hours: 0, minutes: 0 };

  // Review stage: compute from timestamps
  const reviewState: SlaState = workflow.review.completedAt
    ? 'completed'
    : workflow.review.assignedAt
      ? computeSlaState(workflow.review, getNow())
      : 'not_started';

  const reviewTimeRemaining: TimeRemaining = workflow.review.deadline
    ? computeTimeRemaining(workflow.review.deadline, getNow())
    : { ms: 0, label: '—', isOverdue: false, hours: 0, minutes: 0 };

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="SLA Workflow"
          description="Two-stage 24-hour SLA tracking. Each stage has its own timer."
          icon={<Timer className="h-4 w-4" />}
          actions={<SlaBadge state={status.currentState} size="md" />}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Stage 1: Department SLA */}
        <SlaStageCard
          stage="department"
          stageData={workflow.department}
          state={deptState}
          timeRemaining={deptTimeRemaining}
          isActive={status.activeStage === 'department'}
        />

        {/* Connector */}
        <div className="flex items-center justify-center -my-1">
          <div className="h-4 w-px bg-border" />
        </div>

        {/* Stage 2: Review SLA */}
        <SlaStageCard
          stage="review"
          stageData={workflow.review}
          state={reviewState}
          timeRemaining={reviewTimeRemaining}
          isActive={status.activeStage === 'review'}
        />

        {/* Summary */}
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Current Status</span>
            <SlaTimerInline status={status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Export re-exports for convenience ─── */

export { getSlaStatus } from '@/lib/sla';
export type { SlaStatus, SlaWorkflowData, SlaState, SlaStage } from '@/lib/sla';
