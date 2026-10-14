export type Status =
  | 'new'
  | 'assigned_to_dept'
  | 'dept_viewed'
  | 'assigned_to_am'
  | 'in_review'
  | 'reviewed'
  | 'ready_for_admin'
  | 'nominated'
  | 'returned_for_review'
  | 'not_nominatable'
  | 'deferred'
  | 'sla_breached'
  | 'reassigned'
  | 'archived';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type AssessmentLevel = 'strong' | 'moderate' | 'weak' | 'unknown';

export type FitCategory = 'fit';

export type PersonCategory = 'person';

export type TimingCategory = 'timing';

export type IntelligenceCategory = FitCategory | PersonCategory | TimingCategory;

export interface StatusConfig {
  label: string;
  shortLabel: string;
  dotClass: string;
  badgeClass: string;
}

export const STATUS_CONFIG: Record<Status, StatusConfig> = {
  new: {
    label: 'New',
    shortLabel: 'New',
    dotClass: 'bg-ink-300',
    badgeClass:
      'bg-ink-50 text-ink-500 dark:bg-ink-600 dark:text-ink-200 border-ink-100 dark:border-ink-500',
  },
  assigned_to_dept: {
    label: 'Assigned to Sales Department',
    shortLabel: 'Assigned to Dept',
    dotClass: 'bg-ink-400',
    badgeClass:
      'bg-ink-50 text-ink-600 dark:bg-ink-600 dark:text-ink-200 border-ink-200 dark:border-ink-500',
  },
  dept_viewed: {
    label: 'Department Viewed',
    shortLabel: 'Dept Viewed',
    dotClass: 'bg-ink-500',
    badgeClass:
      'bg-ink-50 text-ink-700 dark:bg-ink-500/30 dark:text-ink-200 border-ink-200 dark:border-ink-500',
  },
  assigned_to_am: {
    label: 'Assigned to Account Manager',
    shortLabel: 'AM Assigned',
    dotClass: 'bg-ink-500',
    badgeClass:
      'bg-ink-50 text-ink-700 dark:bg-ink-500/30 dark:text-ink-200 border-ink-200 dark:border-ink-500',
  },
  in_review: {
    label: 'In Review',
    shortLabel: 'In Review',
    dotClass: 'bg-warning',
    badgeClass:
      'bg-warning-light text-ink-800 dark:bg-warning/15 dark:text-warning border-warning/30 dark:border-warning/20',
  },
  reviewed: {
    label: 'Reviewed',
    shortLabel: 'Reviewed',
    dotClass: 'bg-success',
    badgeClass:
      'bg-success-light text-success dark:bg-success/15 dark:text-success border-success/30 dark:border-success/20',
  },
  ready_for_admin: {
    label: 'Ready for Administrator Decision',
    shortLabel: 'Ready for Admin',
    dotClass: 'bg-gold',
    badgeClass:
      'bg-gold-50 text-gold-700 dark:bg-gold/15 dark:text-gold border-gold-200 dark:border-gold/20',
  },
  nominated: {
    label: 'Nominated to CRM',
    shortLabel: 'Nominated',
    dotClass: 'bg-gold',
    badgeClass:
      'bg-gold-50 text-gold-700 dark:bg-gold/15 dark:text-gold border-gold-200 dark:border-gold/20',
  },
  returned_for_review: {
    label: 'Returned for Review',
    shortLabel: 'Returned',
    dotClass: 'bg-critical',
    badgeClass:
      'bg-critical/10 text-critical dark:bg-critical/15 dark:text-critical-light border-critical/20 dark:border-critical/20',
  },
  not_nominatable: {
    label: 'Not Nominatable',
    shortLabel: 'Not Nominatable',
    dotClass: 'bg-critical',
    badgeClass:
      'bg-critical/10 text-critical dark:bg-critical/15 dark:text-critical-light border-critical/20 dark:border-critical/20',
  },
  deferred: {
    label: 'Deferred',
    shortLabel: 'Deferred',
    dotClass: 'bg-ink-400',
    badgeClass:
      'bg-ink-50 text-ink-500 dark:bg-ink-600 dark:text-ink-200 border-ink-200 dark:border-ink-500',
  },
  sla_breached: {
    label: 'SLA Breached',
    shortLabel: 'SLA Breached',
    dotClass: 'bg-critical',
    badgeClass:
      'bg-critical/10 text-critical dark:bg-critical/15 dark:text-critical-light border-critical/20 dark:border-critical/20',
  },
  reassigned: {
    label: 'Reassigned',
    shortLabel: 'Reassigned',
    dotClass: 'bg-warning',
    badgeClass:
      'bg-warning-light text-ink-800 dark:bg-warning/15 dark:text-warning border-warning/30 dark:border-warning/20',
  },
  archived: {
    label: 'Archived',
    shortLabel: 'Archived',
    dotClass: 'bg-ink-300',
    badgeClass:
      'bg-ink-50 text-ink-400 dark:bg-ink-600 dark:text-ink-300 border-ink-100 dark:border-ink-500',
  },
};

export interface PriorityConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  critical: {
    label: 'Critical',
    badgeClass:
      'bg-critical/10 text-critical dark:text-critical-light border-critical/20',
    dotClass: 'bg-critical',
  },
  high: {
    label: 'High',
    badgeClass:
      'bg-risk/10 text-risk border-risk/20 dark:bg-risk/15 dark:text-risk',
    dotClass: 'bg-risk',
  },
  medium: {
    label: 'Medium',
    badgeClass:
      'bg-warning/10 text-ink-700 dark:text-warning border-warning/20 dark:bg-warning/15',
    dotClass: 'bg-warning',
  },
  low: {
    label: 'Low',
    badgeClass:
      'bg-ink-50 text-ink-400 dark:bg-ink-600 dark:text-ink-300 border-ink-100 dark:border-ink-500',
    dotClass: 'bg-ink-300',
  },
};

export interface AssessmentConfig {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  barClass: string;
  icon: 'check' | 'minus' | 'alert' | 'question';
}

export const ASSESSMENT_CONFIG: Record<AssessmentLevel, AssessmentConfig> = {
  strong: {
    label: 'Strong',
    textClass: 'text-success dark:text-success',
    bgClass: 'bg-success/5 dark:bg-success/10',
    borderClass: 'border-success/20',
    barClass: 'bg-success',
    icon: 'check',
  },
  moderate: {
    label: 'Moderate',
    textClass: 'text-ink-600 dark:text-ink-200',
    bgClass: 'bg-ink-50 dark:bg-ink-600/50',
    borderClass: 'border-ink-200 dark:border-ink-500',
    barClass: 'bg-ink-400 dark:bg-ink-300',
    icon: 'minus' as const,
  },
  weak: {
    label: 'Weak',
    textClass: 'text-risk dark:text-risk',
    bgClass: 'bg-risk/5 dark:bg-risk/10',
    borderClass: 'border-risk/20',
    barClass: 'bg-risk',
    icon: 'alert',
  },
  unknown: {
    label: 'Unknown',
    textClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    borderClass: 'border-border',
    barClass: 'bg-muted-foreground/40',
    icon: 'question',
  },
};

export const INTELLIGENCE_FRAMEWORK = {
  fit: {
    label: 'FIT',
    subtitle: 'Company Relevance',
    description: 'Is the company/business relevant to ABBE?',
  },
  person: {
    label: 'PERSON',
    subtitle: 'Decision-Maker',
    description: 'Is the right decision-maker/contact identified?',
  },
  timing: {
    label: 'TIMING',
    subtitle: 'Engagement Window',
    description: 'Is there a credible reason to engage now?',
  },
} as const;
