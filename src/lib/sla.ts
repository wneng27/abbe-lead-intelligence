import type { Status } from '@/lib/tokens';

/* ─── Two-Stage 24-Hour SLA Workflow ─── */

export const SLA_DURATION_HOURS = 24;

export type SlaState = 'not_started' | 'active' | 'approaching' | 'due_soon' | 'breached' | 'completed';

export type SlaStage = 'department' | 'review' | 'none';

export interface SlaStageData {
  /** ISO timestamp string — mock now, replaceable with backend timestamps later */
  assignedAt: string | null;
  /** ISO timestamp string — mock now, replaceable with backend timestamps later */
  deadline: string | null;
  /** ISO timestamp string when the stage was completed */
  completedAt: string | null;
}

export interface SlaWorkflowData {
  department: SlaStageData;
  review: SlaStageData;
}

/* ─── State config ─── */

export interface SlaStateConfig {
  label: string;
  /** Tailwind classes for badge */
  badgeClass: string;
  dotClass: string;
  textClass: string;
  /** Background tint for cards/panels */
  bgClass: string;
  borderClass: string;
  icon: 'clock' | 'hourglass' | 'alert' | 'overdue' | 'check' | 'dash';
}

export const SLA_STATE_CONFIG: Record<SlaState, SlaStateConfig> = {
  not_started: {
    label: 'Not Started',
    badgeClass: 'bg-secondary text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground/40',
    textClass: 'text-muted-foreground',
    bgClass: 'bg-secondary/30',
    borderClass: 'border-border',
    icon: 'dash',
  },
  active: {
    label: 'Active',
    badgeClass: 'bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success',
    dotClass: 'bg-success',
    textClass: 'text-success',
    bgClass: 'bg-success/5',
    borderClass: 'border-success/20',
    icon: 'clock',
  },
  approaching: {
    label: 'Approaching Deadline',
    badgeClass: 'bg-warning-light text-ink-800 border-warning/30 dark:bg-warning/15 dark:text-warning dark:border-warning/20',
    dotClass: 'bg-warning',
    textClass: 'text-warning',
    bgClass: 'bg-warning/5',
    borderClass: 'border-warning/30',
    icon: 'hourglass',
  },
  due_soon: {
    label: 'Due Soon',
    badgeClass: 'bg-risk/10 text-risk border-risk/30 dark:bg-risk/15 dark:text-risk',
    dotClass: 'bg-risk',
    textClass: 'text-risk',
    bgClass: 'bg-risk/5',
    borderClass: 'border-risk/30',
    icon: 'hourglass',
  },
  breached: {
    label: 'SLA Breached',
    badgeClass: 'bg-critical/10 text-critical border-critical/20 dark:bg-critical/15 dark:text-critical-light',
    dotClass: 'bg-critical',
    textClass: 'text-critical dark:text-critical-light',
    bgClass: 'bg-critical/5',
    borderClass: 'border-critical/20',
    icon: 'overdue',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-success-light text-success border-success/30 dark:bg-success/15 dark:text-success dark:border-success/20',
    dotClass: 'bg-success',
    textClass: 'text-success',
    bgClass: 'bg-success/5',
    borderClass: 'border-success/20',
    icon: 'check',
  },
};

/* ─── Stage labels ─── */

export const STAGE_LABELS: Record<SlaStage, string> = {
  department: 'Department SLA',
  review: 'Review SLA',
  none: 'No Active SLA',
};

/* ─── Current time reference — evaluates at call time so SLA stays live ─── */
export function getNow(): Date { return new Date(); }

/* ─── Time formatting ─── */

export interface TimeRemaining {
  /** Total milliseconds remaining (negative if breached) */
  ms: number;
  /** Human-readable label like "17h 42m remaining" or "BREACHED — 3h 12m overdue" */
  label: string;
  /** True if the deadline has passed */
  isOverdue: boolean;
  hours: number;
  minutes: number;
}

export function computeTimeRemaining(deadlineIso: string | null, now: Date = getNow()): TimeRemaining {
  if (!deadlineIso) {
    return { ms: 0, label: '—', isOverdue: false, hours: 0, minutes: 0 };
  }
  const deadline = new Date(deadlineIso);
  const diffMs = deadline.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (isOverdue) {
    return {
      ms: diffMs,
      isOverdue: true,
      hours,
      minutes,
      label: `BREACHED — ${hours}h ${minutes}m overdue`,
    };
  }
  return {
    ms: diffMs,
    isOverdue: false,
    hours,
    minutes,
    label: `${hours}h ${minutes}m remaining`,
  };
}

/* ─── Determine SLA state from stage data ─── */

export function computeSlaState(stage: SlaStageData, now: Date = getNow()): SlaState {
  if (stage.completedAt) return 'completed';
  if (!stage.assignedAt || !stage.deadline) return 'not_started';

  const diffMs = new Date(stage.deadline).getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining < 0) return 'breached';
  if (hoursRemaining <= 2) return 'due_soon';
  if (hoursRemaining <= 6) return 'approaching';
  return 'active';
}

/* ─── Determine which stage is currently active based on opportunity status ─── */

export function getActiveStage(status: Status): SlaStage {
  switch (status) {
    case 'new':
    case 'assigned_to_dept':
      // Not yet acknowledged by department — no SLA running yet
      return 'none';
    case 'dept_viewed':
      // Department acknowledged — department SLA is active until AM is assigned
      return 'department';
    case 'assigned_to_am':
      // Assigned to AM but review hasn't started — department SLA ended, review SLA hasn't started
      // Actually: Stage 1 ends when AM is assigned, Stage 2 begins
      // But if review hasn't started, we still count the review SLA from assignment time
      return 'review';
    case 'in_review':
      return 'review';
    case 'returned_for_review':
      return 'review';
    case 'reassigned':
      return 'review';
    case 'sla_breached':
      return 'review';
    case 'reviewed':
      return 'none'; // Review completed, no active SLA
    case 'ready_for_admin':
      return 'none';
    case 'nominated':
      return 'none';
    case 'not_nominatable':
      return 'none';
    case 'deferred':
      return 'none';
    case 'archived':
      return 'none';
    default:
      return 'none';
  }
}

/* ─── Get the full SLA status for an opportunity ─── */

export interface SlaStatus {
  activeStage: SlaStage;
  currentState: SlaState;
  timeRemaining: TimeRemaining;
  /** The stage data for the currently active stage */
  activeStageData: SlaStageData | null;
  /** Label for the SLA context, e.g. "Department SLA — 18h 24m remaining" */
  contextLabel: string;
  /** Short label for cards/badges */
  shortLabel: string;
}

export function getSlaStatus(
  workflow: SlaWorkflowData,
  status: Status,
  now: Date = getNow(),
): SlaStatus {
  const activeStage = getActiveStage(status);

  if (activeStage === 'none') {
    // Check if review was completed
    if (workflow.review.completedAt) {
      return {
        activeStage: 'none',
        currentState: 'completed',
        timeRemaining: { ms: 0, label: 'Review completed', isOverdue: false, hours: 0, minutes: 0 },
        activeStageData: null,
        contextLabel: 'Review completed',
        shortLabel: 'Completed',
      };
    }
    // Check if department stage was completed but review hasn't started
    if (workflow.department.completedAt && !workflow.review.assignedAt) {
      return {
        activeStage: 'none',
        currentState: 'not_started',
        timeRemaining: { ms: 0, label: 'Awaiting review', isOverdue: false, hours: 0, minutes: 0 },
        activeStageData: null,
        contextLabel: 'No active review SLA',
        shortLabel: 'No SLA',
      };
    }
    return {
      activeStage: 'none',
      currentState: 'not_started',
      timeRemaining: { ms: 0, label: 'No active SLA', isOverdue: false, hours: 0, minutes: 0 },
      activeStageData: null,
      contextLabel: 'No active review SLA',
      shortLabel: 'No SLA',
    };
  }

  const stageData = workflow[activeStage];
  const state = computeSlaState(stageData, now);
  const timeRemaining = computeTimeRemaining(stageData.deadline, now);
  const stageLabel = STAGE_LABELS[activeStage];

  const contextLabel = state === 'completed'
    ? `${stageLabel} — completed`
    : `${stageLabel} — ${timeRemaining.label}`;

  const shortLabel = state === 'completed'
    ? 'Completed'
    : state === 'breached'
      ? `${timeRemaining.hours}h ${timeRemaining.minutes}m overdue`
      : `${timeRemaining.hours}h ${timeRemaining.minutes}m left`;

  return {
    activeStage,
    currentState: state,
    timeRemaining,
    activeStageData: stageData,
    contextLabel,
    shortLabel,
  };
}

/* ─── Helper to create deadline from assignment + duration ─── */

export function createDeadline(assignedAt: string, durationHours: number = SLA_DURATION_HOURS): string {
  const d = new Date(assignedAt);
  d.setTime(d.getTime() + durationHours * 60 * 60 * 1000);
  return d.toISOString();
}

/* ─── Format ISO timestamp for display ─── */

export function formatSlaTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
