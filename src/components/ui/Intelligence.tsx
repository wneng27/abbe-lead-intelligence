import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Minus, AlertTriangle, HelpCircle, FileText, Link as LinkIcon, Quote } from 'lucide-react';
import {
  ASSESSMENT_CONFIG,
  INTELLIGENCE_FRAMEWORK,
  type AssessmentLevel,
  type IntelligenceCategory,
} from '@/lib/tokens';

/* ─── Timeline Item ─── */

export interface TimelineItemProps {
  title: string;
  timestamp: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  isLast?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TimelineItem = ({
  title,
  timestamp,
  description,
  icon,
  iconColor = 'bg-secondary text-muted-foreground',
  isLast = false,
  className,
  children,
}: TimelineItemProps) => {
  return (
    <div className={cn('relative flex gap-3 pb-6', isLast && 'pb-0', className)}>
      {!isLast && (
        <span className="absolute left-3.5 top-8 bottom-0 w-px bg-border" />
      )}
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full shrink-0 z-10 ring-4 ring-background dark:ring-card',
          iconColor
        )}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className="text-xs text-muted-foreground shrink-0">{timestamp}</span>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
};

/* ─── Progress Indicator ─── */

export interface ProgressIndicatorProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'risk';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const progressVariants = {
  default: 'bg-ink-400 dark:bg-ink-300',
  gold: 'bg-gold',
  success: 'bg-success',
  warning: 'bg-warning',
  risk: 'bg-risk',
};

const progressSizes = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

export const ProgressIndicator = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className,
}: ProgressIndicatorProps) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label || 'Progress'}</span>
          <span className="font-medium text-foreground tabular-nums">
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div
        className={cn('w-full rounded-full bg-secondary overflow-hidden', progressSizes[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', progressVariants[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/* ─── Score Indicator ─── */

export interface ScoreIndicatorProps {
  score: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showRing?: boolean;
  className?: string;
}

const scoreSizes = {
  sm: { box: 'h-12 w-12', text: 'text-sm', label: 'text-2xs' },
  md: { box: 'h-16 w-16', text: 'text-lg', label: 'text-xs' },
  lg: { box: 'h-20 w-20', text: 'text-2xl', label: 'text-sm' },
};

function getScoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.75) return 'text-success';
  if (pct >= 0.5) return 'text-ink-600 dark:text-ink-200';
  if (pct >= 0.25) return 'text-risk';
  return 'text-critical dark:text-critical-light';
}

function getScoreStroke(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.75) return 'rgb(47 122 59)';
  if (pct >= 0.5) return 'rgb(91 100 114)';
  if (pct >= 0.25) return 'rgb(230 126 34)';
  return 'rgb(192 57 43)';
}

export const ScoreIndicator = ({
  score,
  max = 100,
  label,
  size = 'md',
  showRing = true,
  className,
}: ScoreIndicatorProps) => {
  const s = scoreSizes[size];
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const color = getScoreColor(score, max);
  const stroke = getScoreStroke(score, max);
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (pct / 100) * circumference;

  if (!showRing) {
    return (
      <div className={cn('inline-flex flex-col items-center', className)}>
        <span className={cn('font-bold tabular-nums', s.text, color)}>{score}</span>
        {label && <span className={cn('text-muted-foreground', s.label)}>{label}</span>}
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <div className={cn('relative flex items-center justify-center', s.box)}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="5" className="stroke-secondary" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="5"
            stroke={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="relative flex flex-col items-center">
          <span className={cn('font-bold tabular-nums', s.text, color)}>{score}</span>
          <span className={cn('text-muted-foreground', s.label)}>/{max}</span>
        </div>
      </div>
      {label && <span className={cn('mt-1.5 text-muted-foreground', s.label)}>{label}</span>}
    </div>
  );
};

/* ─── Evidence Item ─── */

export type EvidenceType = 'document' | 'link' | 'quote' | 'note';

const evidenceIcons: Record<EvidenceType, React.ReactNode> = {
  document: <FileText className="h-3.5 w-3.5" />,
  link: <LinkIcon className="h-3.5 w-3.5" />,
  quote: <Quote className="h-3.5 w-3.5" />,
  note: <FileText className="h-3.5 w-3.5" />,
};

export interface EvidenceItemProps {
  type: EvidenceType;
  title: string;
  source?: string;
  timestamp?: string;
  confidence?: AssessmentLevel;
  onClick?: () => void;
  className?: string;
}

export const EvidenceItem = ({
  type,
  title,
  source,
  timestamp,
  confidence,
  onClick,
  className,
}: EvidenceItemProps) => {
  const confConfig = confidence ? ASSESSMENT_CONFIG[confidence] : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all',
        onClick && 'cursor-pointer hover:border-muted-foreground/30 hover:shadow-sm',
        className
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-muted-foreground shrink-0">
        {evidenceIcons[type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {source && <span className="text-xs text-muted-foreground">{source}</span>}
          {timestamp && (
            <>
              {source && <span className="text-xs text-muted-foreground/60">·</span>}
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </>
          )}
          {confConfig && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-2xs font-medium',
                confConfig.bgClass,
                confConfig.borderClass,
                confConfig.textClass
              )}
            >
              {confConfig.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── FIT / PERSON / TIMING Indicators ─── */

const assessmentIcons = {
  check: <Check className="h-3 w-3" />,
  minus: <Minus className="h-3 w-3" />,
  alert: <AlertTriangle className="h-3 w-3" />,
  question: <HelpCircle className="h-3 w-3" />,
};

export interface IntelligenceIndicatorProps {
  category: IntelligenceCategory;
  level: AssessmentLevel;
  score?: number;
  showLabel?: boolean;
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const IntelligenceIndicator = ({
  category,
  level,
  score,
  showLabel = true,
  showScore = false,
  size = 'md',
  className,
}: IntelligenceIndicatorProps) => {
  const config = ASSESSMENT_CONFIG[level] ?? ASSESSMENT_CONFIG.unknown;
  const framework = INTELLIGENCE_FRAMEWORK[category];
  const isSm = size === 'sm';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border',
        config.bgClass,
        config.borderClass,
        isSm ? 'px-2 py-1' : 'px-2.5 py-1.5',
        className
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full shrink-0',
          isSm ? 'h-4 w-4' : 'h-5 w-5',
          config.barClass,
          'text-white'
        )}
      >
        {assessmentIcons[config.icon]}
      </span>
      <div className="flex flex-col leading-tight">
        <span className={cn('font-semibold uppercase tracking-wide', isSm ? 'text-2xs' : 'text-xs', config.textClass)}>
          {framework.label}
        </span>
        {showLabel && (
          <span className={cn('text-muted-foreground', isSm ? 'text-2xs' : 'text-xs')}>
            {config.label}
          </span>
        )}
      </div>
      {showScore && score !== undefined && (
        <span className={cn('ml-auto font-bold tabular-nums', isSm ? 'text-xs' : 'text-sm', config.textClass)}>
          {score}
        </span>
      )}
    </div>
  );
};

/* ─── Intelligence Summary (compact 3-pill row) ─── */

export interface IntelligenceSummaryProps {
  fit: AssessmentLevel;
  person: AssessmentLevel;
  timing: AssessmentLevel;
  fitScore?: number;
  personScore?: number;
  timingScore?: number;
  showScores?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const IntelligenceSummary = ({
  fit,
  person,
  timing,
  fitScore,
  personScore,
  timingScore,
  showScores = false,
  size = 'md',
  className,
}: IntelligenceSummaryProps) => {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <IntelligenceIndicator category="fit" level={fit} score={fitScore} showScore={showScores} showLabel size={size} />
      <span className="text-muted-foreground/60 text-xs">→</span>
      <IntelligenceIndicator category="person" level={person} score={personScore} showScore={showScores} showLabel size={size} />
      <span className="text-muted-foreground/60 text-xs">→</span>
      <IntelligenceIndicator category="timing" level={timing} score={timingScore} showScore={showScores} showLabel size={size} />
    </div>
  );
};
