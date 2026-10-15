import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Breadcrumb,
  SectionHeader,
  StatusBadge,
  IntelligenceIndicator,
  Avatar,
  Modal,
  useToast,
  EmptyState,
  TimelineItem,
} from '@/components/ui';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Globe,
  Calendar,
  Clock,
  User,
  UserCheck,
  UserPlus,
  UserX,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Link as LinkIcon,
  History,
  ClipboardCheck,
  Undo2,
  Trophy,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Briefcase,
  Info,
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  AlertTriangle,
  Lock,
  TrendingUp,
  Zap,
  FlaskConical,
  Timer,
  Users,
  ClipboardList,
  NotebookPen,
  CircleDashed,
  Eye,
  Archive,
  Trash2,
  Save,
  ArrowRight,
  Beaker,
  Radar,
  ScanLine,
  Brain,
  Lightbulb,
  AlertOctagon,
  HelpCircle,
  Gauge,
  Layers,
  Database,
  FileSearch,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useStore, type ActivityEntry } from '@/lib/store';
import { createReview, createCrmNomination, fetchReviews, fetchCrmNominationsByOpportunity, fetchUserByEmail } from '@/lib/db';
import {
  PRIORITY_LABELS,
  PRIORITY_SHORT,
  fetchOpportunityDetailFromDb,
  type Opportunity,
  type EvidenceStatus,
  type EvidenceCategory,
  type TimelineEvent,
  type OpportunityDetail,
  type EvidenceItem,
  type BusinessSignal,
  type AiFindings,
  type GatekeeperState,
} from '@/lib/opportunities';
import type { Status, AssessmentLevel } from '@/lib/tokens';
import type { Role } from '@/lib/navigation';
import { AssignmentModal, type AssignmentRecord } from './AssignmentModal';
import { ReviewWorkspace, type ReviewRecord, type ReviewAssessmentData } from './ReviewWorkspace';
import {
  SlaBadge,
  SlaTimerInline,
  SlaWorkflowPanel,
  getSlaStatus as getSlaWorkflowStatus,
  type SlaStatus as SlaWorkflowStatus,
} from '@/components/ui/Sla';
import { getNow, createDeadline, SLA_STATE_CONFIG, formatSlaTimestamp, type SlaWorkflowData } from '@/lib/sla';

/* ─── Helpers ─── */

function priorityBadgeClass(priority: string) {
  return priority === 'P1' ? 'gold' : 'outline';
}

function normalizeAssessmentLevel(value: string | undefined | null): AssessmentLevel {
  if (!value) return 'unknown';
  const lower = value.toLowerCase();
  if (lower === 'strong' || lower === 'moderate' || lower === 'weak' || lower === 'unknown') {
    return lower as AssessmentLevel;
  }
  return 'unknown';
}

function safePriorityShort(priority: string): string {
  return (PRIORITY_SHORT as Record<string, string>)[priority] ?? priority;
}

function safePriorityLabel(priority: string): string {
  return (PRIORITY_LABELS as Record<string, string>)[priority] ?? priority;
}

function verificationBadge(status: string): { variant: 'success' | 'warning' | 'critical'; icon: React.ReactNode; label: string } {
  switch (status) {
    case 'Verified':
      return { variant: 'success', icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Verified' };
    case 'Needs Verification':
      return { variant: 'warning', icon: <ShieldAlert className="h-3.5 w-3.5" />, label: 'Needs Verification' };
    default:
      return { variant: 'critical', icon: <ShieldX className="h-3.5 w-3.5" />, label: 'Unverified' };
  }
}

function evidenceStatusBadge(status: EvidenceStatus): { variant: 'success' | 'warning' | 'default'; label: string } {
  switch (status) {
    case 'verified':
      return { variant: 'success', label: 'Verified' };
    case 'needs_verification':
      return { variant: 'warning', label: 'Needs Verification' };
    default:
      return { variant: 'default', label: 'Unverified' };
  }
}

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  fit: 'FIT',
  person: 'PERSON',
  timing: 'TIMING',
  general: 'GENERAL',
};

const CATEGORY_COLORS: Record<EvidenceCategory, string> = {
  fit: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  person: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  timing: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  general: 'bg-secondary text-muted-foreground border-border',
};

const CONFIDENCE_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  high: { label: 'High', variant: 'success' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'default' },
};

const STATUS_LABELS: Record<Status, string> = {
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

/* ─── SECTION 1: Lead Header ─── */

function LeadHeaderSection({ opp, status, detail, slaStatus, getDeptLeaderName, getAccountManagerName }: { opp: Opportunity; status: Status; detail: OpportunityDetail | null; slaStatus: SlaWorkflowStatus; getDeptLeaderName: (departmentName: string) => string | null; getAccountManagerName: (email: string | null) => string | null }) {
  const salesLeader = getDeptLeaderName(opp.department) ?? 'Unassigned';
  const amName = opp.accountManager ? getAccountManagerName(opp.accountManager) ?? 'Unknown' : 'Unassigned';
  const slaConfig = SLA_STATE_CONFIG[slaStatus.currentState];
  const assignmentDate = slaStatus.activeStageData?.assignedAt ?? opp.sla.review.assignedAt ?? opp.sla.department.assignedAt ?? null;
  const deadline = slaStatus.activeStageData?.deadline ?? null;

  return (
    <Card className="border-l-4 border-l-gold">
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{opp.company}</h2>
            <p className="text-sm text-muted-foreground">{opp.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={priorityBadgeClass(opp.priority)} dot dotClass={opp.priority === 'P1' ? 'bg-gold' : 'bg-muted-foreground'}>
              {safePriorityShort(opp.priority)} — {safePriorityLabel(opp.priority)}
            </Badge>
            <StatusBadge status={status} size="md" />
            <SlaBadge state={slaStatus.currentState} size="md" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          <HeaderMetaItem icon={<Building2 className="h-3.5 w-3.5" />} label="Department" value={opp.department} />
          <HeaderMetaItem icon={<UserCheck className="h-3.5 w-3.5" />} label="Sales Department" value={salesLeader} />
          <HeaderMetaItem icon={<User className="h-3.5 w-3.5" />} label="Account Manager" value={amName} />
          <HeaderMetaItem icon={<ClipboardList className="h-3.5 w-3.5" />} label="Workflow Stage" value={STATUS_LABELS[status]} />
          <HeaderMetaItem icon={<Calendar className="h-3.5 w-3.5" />} label="Assignment Date" value={assignmentDate ? formatSlaTimestamp(assignmentDate) : 'Not yet assigned'} />
          <HeaderMetaItem icon={<Clock className="h-3.5 w-3.5" />} label="Deadline" value={deadline ? formatSlaTimestamp(deadline) : '—'} />
          <HeaderMetaItem icon={<MapPin className="h-3.5 w-3.5" />} label="Industry" value={detail?.overview.industry ?? '—'} />
          <HeaderMetaItem icon={<Radar className="h-3.5 w-3.5" />} label="Detected" value={formatSlaTimestamp(detail?.overview.dateSurfaced ?? opp.discoveredDate)} />
          <HeaderMetaItem icon={<Timer className="h-3.5 w-3.5" />} label="SLA Timer" value={slaStatus.contextLabel} valueClass={slaConfig.textClass} />
        </div>
        {(slaStatus.currentState === 'breached' || slaStatus.currentState === 'approaching' || slaStatus.currentState === 'due_soon') && (
          <div className={cn(
            'flex items-start gap-2.5 rounded-lg border p-3',
            slaStatus.currentState === 'breached'
              ? 'border-critical/30 bg-critical/5'
              : 'border-warning/30 bg-warning/5',
          )}>
            {slaStatus.currentState === 'breached'
              ? <AlertCircle className="h-4 w-4 text-critical dark:text-critical-light shrink-0 mt-0.5" />
              : <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
            <div className="flex flex-col gap-0.5">
              <p className={cn(
                'text-sm font-semibold',
                slaStatus.currentState === 'breached'
                  ? 'text-critical dark:text-critical-light'
                  : 'text-warning',
              )}>
                {slaStatus.currentState === 'breached'
                  ? 'SLA Breached — Deadline Overdue'
                  : slaStatus.currentState === 'due_soon'
                    ? 'SLA Deadline Imminent'
                    : 'SLA Deadline Approaching'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {slaStatus.currentState === 'breached'
                  ? `This opportunity has exceeded its SLA deadline and is ${slaStatus.shortLabel.toLowerCase()}. Immediate action is required to prevent further delay.`
                  : `The SLA deadline is approaching. ${slaStatus.shortLabel} remaining before the deadline is breached.`}
              </p>
            </div>
          </div>
        )}
        {!opp.accountManager && (status === 'assigned_to_dept' || status === 'dept_viewed') && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <UserX className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-warning">No Account Manager Assigned</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This opportunity has not yet been assigned to an Account Manager. Assign one to begin the review process.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeaderMetaItem({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={cn('text-sm font-medium text-foreground truncate', valueClass)}>{value}</span>
    </div>
  );
}

/* ─── SECTION 2: Contact Person ─── */

function ContactPersonSection({ detail, opp }: { detail: OpportunityDetail | null; opp: Opportunity }) {
  const p = detail?.person;
  const vb = p ? verificationBadge(p.verificationStatus) : null;
  const hasContact = p?.contactName || opp.contactName;

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Contact Person"
          description="Identified decision-maker and their verification status."
          icon={<UserCheck className="h-4 w-4" />}
          actions={vb ? <Badge variant={vb.variant} dot size="sm">{vb.label}</Badge> : <Badge variant="default" dot size="sm">No Contact</Badge>}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasContact && p ? (
          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {p.contactName && <Avatar name={p.contactName} size="md" />}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-foreground">{p.contactName ?? opp.contactName}</span>
                {(p.contactRole || opp.contactRole) && <span className="text-xs text-muted-foreground">{p.contactRole ?? opp.contactRole}</span>}
                <span className="text-xs text-muted-foreground">{p.company}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border">
              <ContactField icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={p.email} isLink={!!p.email} />
              <ContactField icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={p.phone} />
              <ContactField icon={<Linkedin className="h-3.5 w-3.5" />} label="LinkedIn" value={p.linkedinUrl} isLink={!!p.linkedinUrl} />
              <ContactField icon={<LinkIcon className="h-3.5 w-3.5" />} label="Source" value={p.sourceReference} />
            </div>
            <div className="flex items-center gap-3 pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                {vb?.icon}
                <span className="text-xs font-medium text-foreground">{vb?.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {p.lastVerifiedDate ? `Verified: ${p.lastVerifiedDate}` : 'Not yet verified'}
              </span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ShieldX className="h-6 w-6" />}
            title="Contact not yet identified"
            description="No decision-maker or contact person has been identified for this opportunity yet. Research is ongoing."
          />
        )}
      </CardContent>
    </Card>
  );
}

function ContactField({ icon, label, value, isLink }: { icon: React.ReactNode; label: string; value: string | null | undefined; isLink?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      {value ? (
        isLink ? (
          <a href={`https://${value}`} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground hover:underline inline-flex items-center gap-1">
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-foreground">{value}</span>
        )
      ) : (
        <span className="text-xs text-muted-foreground italic">Not available</span>
      )}
    </div>
  );
}

/* ─── SECTION 3: Lead Intelligence ─── */

function LeadIntelligenceSection({ detail, opp }: { detail: OpportunityDetail | null; opp: Opportunity }) {
  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <SectionHeader
            title="Lead Intelligence"
            description="Company overview, business signals, and FIT / PERSON / TIMING assessments."
            icon={<Sparkles className="h-4 w-4" />}
          />
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="Intelligence not available"
            description="Full intelligence data has not been collected for this opportunity yet."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Lead Intelligence"
          description="Company overview, business signals, and FIT / PERSON / TIMING assessments."
          icon={<Sparkles className="h-4 w-4" />}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Company Overview */}
        <div>
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Company Overview</p>
          <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
            <p className="text-sm text-foreground leading-relaxed">{detail.overview.companyDescription}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {detail.overview.industry}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {detail.overview.location}</span>
            </div>
          </div>
        </div>

        {/* Business Signals */}
        {detail.businessSignals.length > 0 && (
          <div>
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Business Signals</p>
            <div className="flex flex-col gap-2">
              {detail.businessSignals.map((sig) => (
                <BusinessSignalRow key={sig.id} sig={sig} />
              ))}
            </div>
          </div>
        )}

        {/* Trigger / Reason for Engagement */}
        <div>
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Trigger / Reason for Engagement</p>
          <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-foreground">{detail.timing.trigger}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Trigger date: <span className="font-medium text-foreground tabular-nums">{formatSlaTimestamp(detail.timing.triggerDate)}</span></span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{detail.timing.whyRelevantNow}</p>
          </div>
        </div>

        {/* FIT / PERSON / TIMING */}
        <div>
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-2">FIT / PERSON / TIMING Assessment</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AssessmentCard
              title="FIT"
              icon={<Briefcase className="h-4 w-4" />}
              category="fit"
              level={normalizeAssessmentLevel(detail.fit.assessment)}
              body={detail.fit.rationale}
              footer={detail.fit.abbeCapability}
              footerLabel="ABBE Capability"
            />
            <AssessmentCard
              title="PERSON"
              icon={<User className="h-4 w-4" />}
              category="person"
              level={normalizeAssessmentLevel(detail.person.verificationStatus === 'Verified' ? 'strong' : detail.person.verificationStatus === 'Needs Verification' ? 'moderate' : 'weak')}
              body={detail.person.contactName ?? 'No contact identified'}
              footer={detail.person.contactRole ?? undefined}
              footerLabel="Role"
            />
            <AssessmentCard
              title="TIMING"
              icon={<Clock className="h-4 w-4" />}
              category="timing"
              level={normalizeAssessmentLevel(detail.timing.assessment)}
              body={detail.timing.whyRelevantNow}
              footer={formatSlaTimestamp(detail.timing.triggerDate)}
              footerLabel="Trigger Date"
            />
          </div>
        </div>

        {/* Overall Priority */}
        <div>
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Overall Priority</p>
          <div className="rounded-lg border border-border p-3 flex items-center gap-3">
            <Badge variant={priorityBadgeClass(opp.priority)} dot dotClass={opp.priority === 'P1' ? 'bg-gold' : 'bg-muted-foreground'} size="md">
              {safePriorityShort(opp.priority)} — {safePriorityLabel(opp.priority)}
            </Badge>
            <span className="text-sm text-muted-foreground">{detail.recommendedAction.why}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentCard({ title, icon, category, level, body, footer, footerLabel }: {
  title: string;
  icon: React.ReactNode;
  category: 'fit' | 'person' | 'timing';
  level: AssessmentLevel;
  body: string;
  footer?: string;
  footerLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">{icon} {title}</span>
        <IntelligenceIndicator category={category} level={level} size="sm" showLabel />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{body}</p>
      {footer && footerLabel && (
        <div className="pt-1 border-t border-border">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">{footerLabel}</p>
          <p className="text-xs text-foreground mt-0.5">{footer}</p>
        </div>
      )}
    </div>
  );
}

function BusinessSignalRow({ sig }: { sig: BusinessSignal }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <span className={cn(
        'inline-flex items-center justify-center h-7 w-7 rounded-lg shrink-0',
        sig.isMock ? 'bg-secondary text-muted-foreground' : 'bg-gold/10 text-gold'
      )}>
        {sig.isMock ? <FlaskConical className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
      </span>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{sig.type}</span>
          {sig.isMock && <Badge variant="default" size="sm">Mock</Badge>}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{sig.description}</p>
        <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className="tabular-nums">{sig.date}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── SECTION 4: Evidence ─── */

function EvidenceSection({ detail }: { detail: OpportunityDetail }) {
  const hasConflicts = detail.evidence.some((e) => e.conflictNote);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Evidence"
          description="Source-backed evidence supporting the FIT, PERSON, and TIMING assessments. AI interpretation is not shown here as evidence."
          icon={<FileText className="h-4 w-4" />}
          actions={
            hasConflicts ? (
              <Badge variant="critical" dot size="sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Source Conflict
              </Badge>
            ) : undefined
          }
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {detail.evidence.length > 0 ? (
          detail.evidence.map((ev) => <EvidenceRow key={ev.id} ev={ev} />)
        ) : (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Evidence not available"
            description="No source-backed evidence has been collected for this opportunity yet."
          />
        )}
      </CardContent>
    </Card>
  );
}

function EvidenceRow({ ev }: { ev: EvidenceItem }) {
  const sb = evidenceStatusBadge(ev.status);
  const cat = ev.category ?? 'general';
  const conf = ev.confidence ? CONFIDENCE_LABELS[ev.confidence] : null;

  return (
    <div className={cn(
      'rounded-lg border p-4 flex flex-col gap-2.5',
      ev.conflictNote ? 'border-critical/30 bg-critical/5' : 'border-border'
    )}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold border', CATEGORY_COLORS[cat])}>
          {CATEGORY_LABELS[cat]}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {conf && <Badge variant={conf.variant} size="sm">Confidence: {conf.label}</Badge>}
          <Badge variant={sb.variant} dot size="sm">{sb.label}</Badge>
        </div>
      </div>
      <div>
        <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Source</p>
        <p className="text-sm font-medium text-foreground">{ev.source}</p>
      </div>
      <div>
        <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Evidence</p>
        <p className="text-sm text-foreground leading-snug">{ev.statement}</p>
      </div>
      {ev.excerpt && (
        <div className="rounded border border-border bg-secondary/20 p-2.5">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Excerpt</p>
          <p className="text-xs text-muted-foreground italic leading-relaxed">{ev.excerpt}</p>
        </div>
      )}
      {ev.conflictNote && (
        <div className="flex items-start gap-2 rounded border border-critical/20 bg-critical/5 p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-critical shrink-0 mt-0.5" />
          <div>
            <p className="text-2xs font-bold text-critical uppercase tracking-wide">Source Conflict</p>
            <p className="text-xs text-foreground mt-0.5 leading-relaxed">{ev.conflictNote}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1 border-t border-border">
        {ev.sourceType && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 px-1.5 py-0.5 text-2xs font-medium">
            <Layers className="h-2.5 w-2.5" />
            {ev.sourceType}
          </span>
        )}
        <span className="text-2xs font-semibold uppercase tracking-wide">Published:</span>
        <span>{ev.sourceDate}</span>
        {ev.retrievalDate && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-2xs font-semibold uppercase tracking-wide">Retrieved:</span>
            <span>{ev.retrievalDate}</span>
          </>
        )}
        {ev.link && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <a href={ev.link} className="inline-flex items-center gap-1 text-foreground hover:underline">
              <ExternalLink className="h-3 w-3" />
              View source
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── SECTION 3d: Why Was This Identified? ─── */

function WhyIdentifiedSection({ detail }: { detail: OpportunityDetail }) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Why Was This Identified?"
          description="The business signals and detection source that surfaced this opportunity."
          icon={<Radar className="h-4 w-4" />}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-lg border border-border p-3 flex items-start gap-2.5">
          <FileSearch className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">Detection Source</p>
            <p className="text-sm text-foreground leading-relaxed">{detail.overview.source}</p>
          </div>
        </div>
        {detail.businessSignals.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">Business Signals</p>
            {detail.businessSignals.map((sig) => (
              <BusinessSignalRow key={sig.id} sig={sig} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── SECTION 3b: Screening (40/30/30) ─── */

function ScreeningSection({ detail }: { detail: OpportunityDetail }) {
  const fitPct = Math.round((detail.fit.score / detail.fit.maxScore) * 100);
  const personPct = Math.round((detail.person.score / detail.person.maxScore) * 100);
  const timingPct = Math.round((detail.timing.score / detail.timing.maxScore) * 100);
  const totalScore = detail.fit.score + detail.person.score + detail.timing.score;
  const totalMax = detail.fit.maxScore + detail.person.maxScore + detail.timing.maxScore;
  const totalPct = Math.round((totalScore / totalMax) * 100);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Screening"
          description="Weighted scoring across FIT (40), PERSON (30), and TIMING (30)."
          icon={<Gauge className="h-4 w-4" />}
          actions={
            <Badge variant={totalPct >= 80 ? 'success' : totalPct >= 50 ? 'warning' : 'critical'} dot size="sm">
              {totalScore}/{totalMax} · {totalPct}%
            </Badge>
          }
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ScoreBar label="FIT" weight="40" score={detail.fit.score} max={detail.fit.maxScore} pct={fitPct} color="bg-blue-500" />
        <ScoreBar label="PERSON" weight="30" score={detail.person.score} max={detail.person.maxScore} pct={personPct} color="bg-emerald-500" />
        <ScoreBar label="TIMING" weight="30" score={detail.timing.score} max={detail.timing.maxScore} pct={timingPct} color="bg-amber-500" />
        <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Total Score</span>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tabular-nums text-foreground">{totalScore}<span className="text-sm text-muted-foreground font-normal">/{totalMax}</span></span>
            <span className={cn('text-sm font-semibold tabular-nums', totalPct >= 80 ? 'text-success' : totalPct >= 50 ? 'text-warning' : 'text-critical')}>{totalPct}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, weight, score, max, pct, color }: {
  label: string;
  weight: string;
  score: number;
  max: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground">{label} <span className="text-muted-foreground font-normal">({weight})</span></span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{score}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── SECTION 3c: Gatekeeper ─── */

const GATEKEEPER_CONFIG: Record<GatekeeperState, { label: string; variant: 'success' | 'warning' | 'critical'; icon: React.ReactNode; borderClass: string; bgClass: string; textClass: string }> = {
  passed: {
    label: 'Passed',
    variant: 'success',
    icon: <ShieldCheck className="h-5 w-5" />,
    borderClass: 'border-success/30',
    bgClass: 'bg-success/5',
    textClass: 'text-success',
  },
  verification_required: {
    label: 'Verification Required',
    variant: 'warning',
    icon: <ShieldAlert className="h-5 w-5" />,
    borderClass: 'border-warning/30',
    bgClass: 'bg-warning/5',
    textClass: 'text-warning',
  },
  failed: {
    label: 'Not Passed',
    variant: 'critical',
    icon: <ShieldX className="h-5 w-5" />,
    borderClass: 'border-critical/30',
    bgClass: 'bg-critical/5',
    textClass: 'text-critical',
  },
};

function GatekeeperSection({ detail }: { detail: OpportunityDetail }) {
  const g = detail.gatekeeper;
  const cfg = GATEKEEPER_CONFIG[g.state];

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Gatekeeper"
          description="Automated quality gate. Determines whether this opportunity meets minimum thresholds to progress."
          icon={<ScanLine className="h-4 w-4" />}
          actions={<Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>}
        />
      </CardHeader>
      <CardContent>
        <div className={cn('rounded-lg border p-4 flex items-start gap-3', cfg.borderClass, cfg.bgClass)}>
          <span className={cn('shrink-0', cfg.textClass)}>{cfg.icon}</span>
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className={cn('text-sm font-bold', cfg.textClass)}>{cfg.label}</p>
            <p className="text-sm text-foreground leading-relaxed">{g.description}</p>
            {g.verifiedDate && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 pt-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified: <span className="font-medium text-foreground tabular-nums">{g.verifiedDate}</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── SECTION 4c: AI Findings ─── */

const AI_CONFIDENCE_CONFIG: Record<AiFindings['confidence'], { label: string; variant: 'success' | 'warning' | 'critical' }> = {
  high: { label: 'High', variant: 'success' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'critical' },
};

function AiFindingsSection({ detail }: { detail: OpportunityDetail }) {
  const ai = detail.aiFindings;
  const conf = AI_CONFIDENCE_CONFIG[ai.confidence];

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="AI Findings"
          description="Automated analysis of evidence. Not a substitute for human review."
          icon={<Brain className="h-4 w-4" />}
          actions={<Badge variant={conf.variant} dot size="sm">Confidence: {conf.label}</Badge>}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Summary
          </p>
          <p className="text-sm text-foreground leading-relaxed">{ai.summary}</p>
        </div>

        {ai.supportingFindings.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3" />
              Supporting Findings
            </p>
            {ai.supportingFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        )}

        {ai.conflicts.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1.5">
              <AlertOctagon className="h-3 w-3" />
              Conflicts
            </p>
            {ai.conflicts.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-critical/20 bg-critical/5 p-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-critical shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{c}</p>
              </div>
            ))}
          </div>
        )}

        {ai.missingInformation.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1.5">
              <HelpCircle className="h-3 w-3" />
              Missing Information
            </p>
            {ai.missingInformation.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{m}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>AI-generated findings are not source evidence. They must be reviewed by a human before any action is taken.</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── SECTION 4b: Research Summary ─── */

function ResearchSummarySection({ detail }: { detail: OpportunityDetail }) {
  const factBased = detail.researchSummary.filter((s) => !s.isAiInterpretation);
  const aiSections = detail.researchSummary.filter((s) => s.isAiInterpretation);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Research Summary"
          description="Consolidated intelligence. Source-backed facts are shown separately from AI interpretation."
          icon={<FileText className="h-4 w-4" />}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {factBased.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">Source-Backed Facts</p>
            {factBased.map((s, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-foreground mb-1">{s.heading}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        )}
        {aiSections.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">AI Interpretation / Recommendation</p>
            </div>
            {aiSections.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">{s.heading}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>AI-generated interpretation is not source evidence. It must be reviewed by a human before any action is taken.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── SECTION 5: Account Manager Review ─── */

interface AMReviewData {
  fitAssessment: string;
  personAssessment: string;
  timingAssessment: string;
  findings: string;
  missingInfo: string;
  notes: string;
  reviewStatus: 'not_started' | 'in_progress' | 'completed' | 'returned';
}

function AccountManagerReviewSection({ reviewData, reviewRecords }: {
  reviewData: AMReviewData;
  reviewRecords: ReviewRecord[];
}) {
  const statusConfig: Record<AMReviewData['reviewStatus'], { label: string; variant: 'default' | 'warning' | 'success' | 'critical' }> = {
    not_started: { label: 'Not Started', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
    returned: { label: 'Returned', variant: 'critical' },
  };
  const sc = statusConfig[reviewData.reviewStatus];

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Account Manager Review"
          description="The Account Manager's own assessment of this opportunity, separate from automated intelligence."
          icon={<NotebookPen className="h-4 w-4" />}
          actions={<Badge variant={sc.variant} dot size="sm">{sc.label}</Badge>}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ReviewFieldDisplay label="FIT Assessment" value={reviewData.fitAssessment} />
          <ReviewFieldDisplay label="PERSON Assessment" value={reviewData.personAssessment} />
          <ReviewFieldDisplay label="TIMING Assessment" value={reviewData.timingAssessment} />
        </div>
        <ReviewFieldDisplay label="Findings" value={reviewData.findings} fullWidth />
        <ReviewFieldDisplay label="Missing Information" value={reviewData.missingInfo} fullWidth />
        <ReviewFieldDisplay label="Notes" value={reviewData.notes} fullWidth />

        {reviewRecords.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">Review History</p>
            {reviewRecords.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  {rec.action.includes('Completed') ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : rec.action.includes('Returned') ? (
                    <Undo2 className="h-3.5 w-3.5 text-critical" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-warning" />
                  )}
                  <span className="text-sm font-medium text-foreground">{rec.action}</span>
                </div>
                <p className="text-xs text-muted-foreground">by {rec.actor} · {rec.timestamp}</p>
                {rec.reason && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Reason:</span> {rec.reason}</p>}
                {rec.assessment?.findings && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Findings:</span> {rec.assessment.findings}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewFieldDisplay({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={cn('rounded-lg border border-border p-3', fullWidth && 'w-full')}>
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-sm', value ? 'text-foreground' : 'text-muted-foreground italic')}>
        {value || 'Not yet completed'}
      </p>
    </div>
  );
}

/* ─── SECTION 6: Ownership ─── */

function OwnershipSection({ opp, currentAccountManager, assignmentRecords, slaStatus, getDeptLeaderName, getAccountManagerName }: {
  opp: Opportunity;
  currentAccountManager: string | null;
  assignmentRecords: AssignmentRecord[];
  slaStatus: SlaWorkflowStatus;
  getDeptLeaderName: (departmentName: string) => string | null;
  getAccountManagerName: (email: string | null) => string | null;
}) {
  const salesLeader = getDeptLeaderName(opp.department) ?? 'Unassigned';
  const amName = currentAccountManager ? getAccountManagerName(currentAccountManager) ?? 'Unknown' : 'Unassigned';
  const slaConfig = SLA_STATE_CONFIG[slaStatus.currentState];
  const lastAssignment = assignmentRecords[0];

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Ownership"
          description="Who owns this opportunity and the current SLA status."
          icon={<Users className="h-4 w-4" />}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <OwnershipField icon={<Building2 className="h-3.5 w-3.5" />} label="Sales Department" value={opp.department} />
          <OwnershipField icon={<User className="h-3.5 w-3.5" />} label="Account Manager" value={amName} highlight={!currentAccountManager} />
          <OwnershipField icon={<Calendar className="h-3.5 w-3.5" />} label="Assignment Date" value={lastAssignment?.timestamp ?? (opp.sla.review.assignedAt ? formatSlaTimestamp(opp.sla.review.assignedAt) : 'Not yet assigned')} />
          <OwnershipField icon={<Timer className="h-3.5 w-3.5" />} label="Current SLA" value={slaStatus.contextLabel} valueClass={slaConfig.textClass} />
          <OwnershipField
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Remaining Time"
            value={slaStatus.timeRemaining.label}
            valueClass={slaConfig.textClass}
          />
          <OwnershipField icon={<UserCheck className="h-3.5 w-3.5" />} label="Sales Department" value={salesLeader} />
        </div>
      </CardContent>
    </Card>
  );
}

function OwnershipField({ icon, label, value, highlight, valueClass }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={cn('rounded-lg border p-3', highlight ? 'border-gold/30 bg-gold/5' : 'border-border')}>
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">{icon} {label}</p>
      <p className={cn('text-sm font-medium mt-0.5', highlight ? 'text-gold' : 'text-foreground', valueClass)}>{value}</p>
    </div>
  );
}

/* ─── SECTION 7: Activity / Audit History ─── */

function ActivityHistorySection({ events }: { events: TimelineEvent[] }) {
  const iconForAction = (action: string): { icon: React.ReactNode; color: string } => {
    if (action.includes('surfaced') || action.includes('Surfaced') || action.includes('New lead')) return { icon: <Globe className="h-3 w-3" />, color: 'bg-ink-400 text-white' };
    if (action.includes('Research') || action.includes('research')) return { icon: <FileText className="h-3 w-3" />, color: 'bg-ink-500 text-white' };
    if (action.includes('organized') || action.includes('Organized') || action.includes('Acknowledged') || action.includes('acknowledged')) return { icon: <ClipboardCheck className="h-3 w-3" />, color: 'bg-ink-600 text-white' };
    if (action.includes('Assigned') || action.includes('assigned') || action.includes('Reassigned')) return { icon: <UserPlus className="h-3 w-3" />, color: 'bg-ink-600 text-white' };
    if (action.includes('viewed') || action.includes('Viewed')) return { icon: <Eye className="h-3 w-3" />, color: 'bg-ink-500 text-white' };
    if (action.includes('Review started') || action.includes('Review restarted')) return { icon: <Play className="h-3 w-3" />, color: 'bg-warning text-ink-900' };
    if (action.includes('Review completed') || action.includes('Review Completed') || action.includes('Submitted')) return { icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-success text-white' };
    if (action.includes('Returned')) return { icon: <Undo2 className="h-3 w-3" />, color: 'bg-critical text-white' };
    if (action.includes('nominated') || action.includes('Nominated') || action.includes('Nominate')) return { icon: <Trophy className="h-3 w-3" />, color: 'bg-gold text-ink-900' };
    if (action.includes('Deferred') || action.includes('deferred')) return { icon: <Clock className="h-3 w-3" />, color: 'bg-secondary text-muted-foreground' };
    if (action.includes('Not Nominatable') || action.includes('not_nominatable')) return { icon: <ShieldX className="h-3 w-3" />, color: 'bg-critical text-white' };
    if (action.includes('Acknowledge') || action.includes('acknowledged')) return { icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-success text-white' };
    if (action.includes('Archived') || action.includes('archived')) return { icon: <Archive className="h-3 w-3" />, color: 'bg-secondary text-muted-foreground' };
    if (action.includes('Review saved')) return { icon: <Save className="h-3 w-3" />, color: 'bg-secondary text-muted-foreground' };
    return { icon: <Info className="h-3 w-3" />, color: 'bg-secondary text-muted-foreground' };
  };

  const formatStatus = (s: string | null | undefined): string | null => {
    if (!s) return null;
    return STATUS_LABELS[s as Status] ?? s;
  };

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Activity / Audit History"
          description="Complete chronological audit trail. Events are append-only and never overwritten."
          icon={<History className="h-4 w-4" />}
        />
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="flex flex-col">
            {events.map((ev, i) => {
              const { icon, color } = iconForAction(ev.action);
              const prevStatus = formatStatus(ev.previousStatus);
              const newStatus = formatStatus(ev.newStatus);
              const hasStatusChange = prevStatus || newStatus;
              const hasMeta = hasStatusChange || ev.reason || ev.department || ev.accountManager;

              return (
                <TimelineItem
                  key={ev.id}
                  title={ev.action}
                  timestamp={ev.timestamp}
                  description={`by ${ev.actor}${ev.role ? ` (${ev.role})` : ''}`}
                  icon={icon}
                  iconColor={color}
                  isLast={i === events.length - 1}
                >
                  {hasMeta && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {hasStatusChange && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 px-1.5 py-0.5 text-2xs">
                          {prevStatus && <span className="text-muted-foreground">{prevStatus}</span>}
                          {prevStatus && newStatus && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                          {newStatus && <span className="font-medium text-foreground">{newStatus}</span>}
                        </span>
                      )}
                      {ev.department && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 px-1.5 py-0.5 text-2xs">
                          <span className="text-muted-foreground">Dept:</span>
                          <span className="font-medium text-foreground">{ev.department}</span>
                        </span>
                      )}
                      {ev.accountManager && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/30 px-1.5 py-0.5 text-2xs">
                          <span className="text-muted-foreground">AM:</span>
                          <span className="font-medium text-foreground">{ev.accountManager}</span>
                        </span>
                      )}
                      {ev.reason && (
                        <span className="inline-flex items-center rounded-md border border-border bg-secondary/20 px-1.5 py-0.5 text-2xs text-muted-foreground italic">
                          {ev.reason}
                        </span>
                      )}
                    </div>
                  )}
                </TimelineItem>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No history" description="Events will appear here as the opportunity progresses." />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Sticky Action Bar — primary actions always visible ─── */

function StickyActionBar({ role, status, onAction }: {
  role: Role;
  status: Status;
  onAction: (action: string) => void;
}) {
  const primaryActions: WorkflowAction[] = [];

  if (role === 'account_manager') {
    if (status === 'assigned_to_am' || status === 'dept_viewed' || status === 'returned_for_review') {
      primaryActions.push({ label: 'Start Review', icon: <Play className="h-4 w-4" />, variant: 'primary', action: 'start_review' });
    }
    if (status === 'in_review') {
      primaryActions.push({ label: 'Submit as Reviewed', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'primary', action: 'submit_review' });
      primaryActions.push({ label: 'Return for Review', icon: <Undo2 className="h-4 w-4" />, variant: 'destructive', action: 'return_for_review' });
    }
  }

  if (role === 'administrator' && (status === 'ready_for_admin' || status === 'reviewed')) {
    primaryActions.push({ label: 'Nominate to CRM', icon: <Trophy className="h-4 w-4" />, variant: 'primary', action: 'nominate' });
    primaryActions.push({ label: 'Return for Review', icon: <Undo2 className="h-4 w-4" />, variant: 'destructive', action: 'return_for_review' });
  }

  if (primaryActions.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-30 -mx-4 px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm sm:mx-0 sm:rounded-xl sm:border">
      <div className="flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
        {primaryActions.map((a) => (
          <Button
            key={a.action}
            variant={a.variant === 'destructive' ? 'outline' : a.variant}
            size="md"
            iconLeft={a.icon}
            onClick={() => onAction(a.action)}
            className={cn(
              'flex-1 justify-center',
              a.variant === 'destructive' && 'text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5',
            )}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* ─── SECTION 8: Actions ─── */

interface WorkflowAction {
  label: string;
  icon: React.ReactNode;
  variant: 'primary' | 'outline' | 'destructive';
  action: string;
  disabled?: boolean;
  disabledReason?: string;
}

function getWorkflowActions(role: Role, status: Status): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  /* Administrator actions */
  if (role === 'administrator') {
    if (status === 'new') {
      actions.push({ label: 'Route to Sales Department', icon: <ArrowRight className="h-4 w-4" />, variant: 'primary', action: 'route_to_dept' });
    }
    if (status === 'ready_for_admin' || status === 'reviewed') {
      actions.push({ label: 'Nominate to CRM', icon: <Trophy className="h-4 w-4" />, variant: 'primary', action: 'nominate' });
      actions.push({ label: 'Return for Review', icon: <Undo2 className="h-4 w-4" />, variant: 'destructive', action: 'return_for_review' });
      actions.push({ label: 'Mark as Not Nominatable', icon: <ShieldX className="h-4 w-4" />, variant: 'outline', action: 'not_nominatable' });
      actions.push({ label: 'Defer for Later', icon: <Clock className="h-4 w-4" />, variant: 'outline', action: 'defer' });
    } else if (status === 'not_nominatable') {
      actions.push({ label: 'Not Nominatable', icon: <ShieldX className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'The Administrator has closed this opportunity. No further actions are available.' });
      actions.push({ label: 'Archive Lead', icon: <Archive className="h-4 w-4" />, variant: 'outline', action: 'archive' });
    } else if (status === 'deferred') {
      actions.push({ label: 'Deferred', icon: <Clock className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has been deferred for later consideration.' });
      actions.push({ label: 'Archive Lead', icon: <Archive className="h-4 w-4" />, variant: 'outline', action: 'archive' });
    } else if (status === 'nominated') {
      actions.push({ label: 'Nominated to CRM', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has already been nominated to the ABBE CRM.' });
      actions.push({ label: 'Archive Lead', icon: <Archive className="h-4 w-4" />, variant: 'outline', action: 'archive' });
    } else if (status === 'archived') {
      actions.push({ label: 'Archived', icon: <Archive className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has been archived. The record is preserved but no longer active.' });
    } else {
      actions.push({ label: 'Nominate to CRM', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'nominate', disabled: true, disabledReason: 'Administrator decision actions are only available when the review is submitted as reviewed.' });
    }
  }

  /* Sales Department actions */
  if (role === 'sales_leader') {
    if (status === 'new' || status === 'assigned_to_dept' || status === 'dept_viewed') {
      actions.push({ label: 'Acknowledge', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'outline', action: 'acknowledge' });
      actions.push({ label: 'Assign Account Manager', icon: <UserPlus className="h-4 w-4" />, variant: 'primary', action: 'assign' });
    }
    if (status === 'assigned_to_am' || status === 'in_review' || status === 'returned_for_review' || status === 'reassigned') {
      actions.push({ label: 'Reassign Account Manager', icon: <UserPlus className="h-4 w-4" />, variant: 'outline', action: 'assign' });
    }
    if (status === 'ready_for_admin' || status === 'reviewed') {
      actions.push({ label: 'Awaiting Administrator Decision', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'Only the Administrator can nominate, return, defer, or mark as not nominatable.' });
    }
  }

  /* Account Manager actions */
  if (role === 'account_manager') {
    if (status === 'assigned_to_am' || status === 'dept_viewed' || status === 'returned_for_review') {
      actions.push({ label: 'Start Review', icon: <Play className="h-4 w-4" />, variant: 'primary', action: 'start_review' });
    }
    if (status === 'in_review') {
      actions.push({ label: 'Submit as Reviewed', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'primary', action: 'submit_review' });
      actions.push({ label: 'Return for Review', icon: <Undo2 className="h-4 w-4" />, variant: 'destructive', action: 'return_for_review' });
      actions.push({ label: 'Add Note', icon: <NotebookPen className="h-4 w-4" />, variant: 'outline', action: 'add_note' });
      actions.push({ label: 'Identify Missing Information', icon: <AlertCircle className="h-4 w-4" />, variant: 'outline', action: 'identify_missing' });
    }
    if (status === 'ready_for_admin' || status === 'reviewed') {
      actions.push({ label: 'Reviewed', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has been submitted as reviewed. The Administrator will decide on CRM nomination.' });
    }
    if (status === 'nominated') {
      actions.push({ label: 'Nominated to CRM', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has been nominated to the ABBE CRM by the Administrator.' });
    }
    if (status === 'not_nominatable') {
      actions.push({ label: 'Not Nominatable', icon: <ShieldX className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'The Administrator has closed this opportunity.' });
    }
    if (status === 'deferred') {
      actions.push({ label: 'Deferred', icon: <Clock className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'The Administrator has deferred this opportunity.' });
    }
    if (status === 'archived') {
      actions.push({ label: 'Archived', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has been archived by the Administrator.' });
    }
  }

  /* Locked actions for non-permitted roles */
  if (actions.length === 0) {
    if (status === 'archived') {
      actions.push({ label: 'Archived', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'This opportunity has been archived.' });
    }
    if (status === 'new' || status === 'assigned_to_dept' || status === 'dept_viewed') {
      actions.push({ label: 'Assign Account Manager', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'assign', disabled: true, disabledReason: 'Only Sales Department and Admins can assign opportunities.' });
    }
    if (status === 'assigned_to_am' || status === 'returned_for_review') {
      actions.push({ label: 'Start Review', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'start_review', disabled: true, disabledReason: 'Only the assigned Account Manager can start a review.' });
    }
    if (status === 'in_review') {
      actions.push({ label: 'Complete Review', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'complete_review', disabled: true, disabledReason: 'Only the assigned Account Manager can complete a review.' });
    }
    if (status === 'ready_for_admin' || status === 'reviewed') {
      actions.push({ label: 'Awaiting Administrator Decision', icon: <Lock className="h-4 w-4" />, variant: 'outline', action: 'none', disabled: true, disabledReason: 'Only the Administrator can make the final CRM nomination decision.' });
    }
  }

  return actions;
}

const STATUS_NEXT_STEP: Record<Status, string> = {
  new: 'This opportunity has been newly discovered from research sources. It needs to be acknowledged and assigned to an Account Manager.',
  assigned_to_dept: 'This opportunity has been assigned to the sales department. A Sales Department needs to acknowledge and assign an Account Manager to begin screening.',
  dept_viewed: 'The department has viewed this opportunity. A Sales Department needs to assign an Account Manager to begin screening.',
  assigned_to_am: 'An Account Manager has been assigned. They should start their review of the screening assessment.',
  in_review: 'The Account Manager is currently reviewing the opportunity. They can complete the review or return it for additional research.',
  reviewed: 'The Account Manager has completed their review. The Administrator will now decide on CRM nomination.',
  ready_for_admin: 'The Account Manager has submitted this opportunity as reviewed. It is now ready for the Administrator to decide on CRM nomination.',
  returned_for_review: 'This opportunity was returned for additional review. The Account Manager should re-examine the evidence and assessment.',
  nominated: 'This opportunity has been nominated to the ABBE CRM. The screening workflow is complete.',
  not_nominatable: 'The Administrator has determined this opportunity is not eligible for CRM nomination. The screening workflow is complete.',
  deferred: 'The Administrator has deferred this opportunity for later consideration. It can be revisited when the time is right.',
  sla_breached: 'This opportunity has breached its SLA deadline. Immediate action is required.',
  reassigned: 'This opportunity has been reassigned to a different Account Manager. The new manager should begin their review.',
  archived: 'This opportunity has been archived. The record is preserved but no longer active in the workflow.',
};

function ActionsSection({ role, status, onAction }: {
  role: Role;
  status: Status;
  onAction: (action: string) => void;
}) {
  const actions = getWorkflowActions(role, status);
  const nextStep = STATUS_NEXT_STEP[status] ?? 'No next step defined.';
  const roleLabel = role === 'administrator' ? 'Administrator' : role === 'sales_leader' ? 'Sales Department' : role === 'account_manager' ? 'Account Manager' : role;

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Actions"
          description={`Available workflow actions for your role: ${roleLabel}.`}
          icon={<CircleDashed className="h-4 w-4" />}
          actions={<StatusBadge status={status} size="sm" />}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What happens next</p>
          <p className="text-sm text-foreground leading-relaxed">{nextStep}</p>
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <div key={a.action} className="flex flex-col gap-1">
                <Button
                  variant={a.variant === 'destructive' ? 'outline' : a.variant}
                  size="md"
                  iconLeft={a.icon}
                  onClick={() => !a.disabled && onAction(a.action)}
                  disabled={a.disabled}
                  className={cn(
                    'w-full justify-center',
                    a.variant === 'destructive' && 'text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5',
                  )}
                >
                  {a.label}
                </Button>
                {a.disabled && a.disabledReason && (
                  <p className="text-2xs text-muted-foreground italic px-1">{a.disabledReason}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">No actions available at this stage.</p>
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>Nomination to the ABBE CRM is a deliberate human action. No automatic nomination will occur. CRM and email integration are not yet connected.</p>
        </div>
        {role === 'administrator' && (
          <div className="pt-3 border-t border-dashed border-warning/30 rounded-lg bg-warning/5 -mx-2 px-3 pb-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Beaker className="h-3.5 w-3.5 text-warning" />
              <p className="text-2xs font-bold text-warning uppercase tracking-wide">Prototype Test Control</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => onAction('delete_test_record')}
              className={cn(
                'w-full justify-center text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5',
              )}
            >
              Delete Test Record
            </Button>
            <p className="text-2xs text-muted-foreground italic mt-1 px-1">
              Permanently removes this test record from the prototype only. No backend deletion is implemented — this will not affect real CRM data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Return for Review Modal ─── */

const AM_RETURN_REASONS = [
  'Missing evidence',
  'Contact requires verification',
  'Insufficient information',
  'Conflicting information',
  'Other',
];

const ADMIN_RETURN_REASONS = [
  'More evidence required',
  'Contact verification required',
  'Review incomplete',
  'Conflicting information',
  'Other',
];

const NOT_NOMINATABLE_REASONS = [
  'Not a Fit',
  'Insufficient Evidence',
  'Invalid Contact',
  'Duplicate',
  'Existing Account',
  'Not Timely',
  'Do Not Pursue',
];

const DEFER_REASONS = [
  'Awaiting trigger event',
  'Pending budget cycle',
  'Contact unavailable',
  'Seasonal consideration',
  'Other',
];

const ARCHIVE_REASONS = [
  'Not a Fit',
  'Insufficient Evidence',
  'Invalid Contact',
  'Duplicate',
  'Existing Account',
  'Not Timely',
  'Do Not Pursue',
  'Deferred',
  'Other',
];

function ReturnForReviewModal({ open, onClose, onConfirm, reasons, isAdmin }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
  reasons: string[];
  isAdmin?: boolean;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(reason, notes);
      setReason('');
      setNotes('');
      setSubmitting(false);
    }, 600);
  };

  const handleClose = () => {
    setReason('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirm: Return for Review"
      description={isAdmin ? 'Send this opportunity back to the Account Manager for additional review. A reason is required.' : 'Send this opportunity back for additional review. A reason is required.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" size="md" iconLeft={<Undo2 className="h-4 w-4" />} onClick={handleConfirm} disabled={!reason || submitting} loading={submitting}>
            {submitting ? 'Returning...' : 'Return for Review'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="return-reason-group" className="text-sm font-medium text-foreground mb-2 block">Reason <span className="text-critical">*</span></label>
          <div id="return-reason-group" role="radiogroup" className="flex flex-col gap-2">
            {reasons.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
                  reason === r ? 'border-critical/30 bg-critical/5' : 'border-border hover:bg-secondary/50'
                )}
              >
                <input
                  type="radio"
                  name="returnReason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 accent-critical"
                />
                <span className="text-sm text-foreground">{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="return-notes" className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</label>
          <textarea
            id="return-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide any additional context for the reviewer..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Not Nominatable Modal ─── */

function NotNominatableModal({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(reason, notes);
      setReason('');
      setNotes('');
      setSubmitting(false);
    }, 600);
  };

  const handleClose = () => {
    setReason('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Mark as Not Nominatable?"
      description="This opportunity will be removed from the nomination pipeline. A disposition reason is required."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" size="md" iconLeft={<ShieldX className="h-4 w-4" />} onClick={handleConfirm} disabled={!reason || submitting} loading={submitting}>
            {submitting ? 'Processing...' : 'Confirm'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-critical/20 bg-critical/5 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-critical/10 text-critical dark:text-critical-light shrink-0">
            <ShieldX className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Irreversible Decision</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              This action closes the screening workflow for this opportunity. It cannot be nominated to CRM after this.
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="not-nom-reason-group" className="text-sm font-medium text-foreground mb-2 block">Disposition Reason <span className="text-critical">*</span></label>
          <div id="not-nom-reason-group" role="radiogroup" className="flex flex-col gap-2">
            {NOT_NOMINATABLE_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
                  reason === r ? 'border-critical/30 bg-critical/5' : 'border-border hover:bg-secondary/50'
                )}
              >
                <input
                  type="radio"
                  name="notNomReason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 accent-critical"
                />
                <span className="text-sm text-foreground">{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="not-nom-notes" className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</label>
          <textarea
            id="not-nom-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide any additional context for this disposition..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Defer Modal ─── */

function DeferModal({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, followUpDate: string, notes: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(reason, followUpDate, notes);
      setReason('');
      setFollowUpDate('');
      setNotes('');
      setSubmitting(false);
    }, 600);
  };

  const handleClose = () => {
    setReason('');
    setFollowUpDate('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Defer Lead for Later?"
      description="Temporarily set this opportunity aside. A reason is required. A follow-up date is optional."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="outline" size="md" iconLeft={<Clock className="h-4 w-4" />} onClick={handleConfirm} disabled={!reason || submitting} loading={submitting}>
            {submitting ? 'Processing...' : 'Confirm Defer'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="defer-reason-group" className="text-sm font-medium text-foreground mb-2 block">Reason <span className="text-critical">*</span></label>
          <div id="defer-reason-group" role="radiogroup" className="flex flex-col gap-2">
            {DEFER_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
                  reason === r ? 'border-warning/30 bg-warning/5' : 'border-border hover:bg-secondary/50'
                )}
              >
                <input
                  type="radio"
                  name="deferReason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 accent-foreground"
                />
                <span className="text-sm text-foreground">{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="defer-followup" className="text-sm font-medium text-foreground mb-1.5 block">Follow-up Date (optional)</label>
          <input
            id="defer-followup"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="defer-notes" className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</label>
          <textarea
            id="defer-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide any additional context for deferral..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Archive Modal ─── */

function ArchiveModal({ open, onClose, onConfirm, opp }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
  opp: Opportunity;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(reason, notes);
      setReason('');
      setNotes('');
      setSubmitting(false);
    }, 600);
  };

  const handleClose = () => {
    setReason('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirm: Archive Lead"
      description="This lead will be removed from the active workflow and archived. The record is preserved. A disposition reason is required."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="outline" size="md" iconLeft={<Archive className="h-4 w-4" />} onClick={handleConfirm} disabled={!reason || submitting} loading={submitting}>
            {submitting ? 'Processing...' : 'Archive Lead'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
            <Archive className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Archive {opp.company}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              The lead record will be preserved in the system for audit purposes but will no longer appear in the active workflow. This action is reversible by an Administrator.
            </p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Disposition Reason <span className="text-critical">*</span></label>
          <div role="radiogroup" className="flex flex-col gap-2">
            {ARCHIVE_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
                  reason === r ? 'border-ink-400/40 bg-ink-50/50 dark:bg-ink-600/20' : 'border-border hover:bg-secondary/50'
                )}
              >
                <input
                  type="radio"
                  name="archiveReason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 accent-foreground"
                />
                <span className="text-sm text-foreground">{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="archive-notes" className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</label>
          <textarea
            id="archive-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide any additional context for this disposition..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Delete Test Record Modal ─── */

function DeleteTestRecordModal({ open, onClose, onConfirm, opp }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  opp: Opportunity;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (confirmText !== 'DELETE' || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm();
      setConfirmText('');
      setSubmitting(false);
    }, 600);
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Delete Test Record — Prototype Only"
      description="Administrator-only prototype control. This permanently removes the test record from the prototype interface. This action cannot be undone."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" size="md" iconLeft={<Trash2 className="h-4 w-4" />} onClick={handleConfirm} disabled={confirmText !== 'DELETE' || submitting} loading={submitting}>
            {submitting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-critical/20 bg-critical/5 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-critical/10 text-critical dark:text-critical-light shrink-0">
            <Trash2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Permanent Deletion</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              You are about to permanently delete the test record for <span className="font-medium text-foreground">{opp.company}</span>. This is only for removing test data from the prototype and does not implement backend deletion logic.
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="delete-confirm" className="text-sm font-medium text-foreground mb-1.5 block">
            Type <span className="font-mono font-bold text-critical">DELETE</span> to confirm
          </label>
          <input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-critical/30 focus:border-critical/30"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Nomination Confirmation Modal ─── */

function NominationConfirmModal({ open, onClose, onConfirm, opp, detail, statusLabel, reviewRecords }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  opp: Opportunity;
  detail: OpportunityDetail | null;
  statusLabel: string;
  reviewRecords: ReviewRecord[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const keyEvidence = detail?.evidence.slice(0, 3) ?? [];

  const handleConfirm = () => {
    if (submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm();
      setSubmitting(false);
    }, 800);
  };
  const contactName = detail?.person.contactName ?? opp.contactName ?? 'No contact identified';
  const contactRole = detail?.person.contactRole ?? opp.contactRole ?? '';
  const submittedReview = reviewRecords.find((r) => r.action === 'Submitted as Reviewed');
  const amAssessment = submittedReview?.assessment;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nominate to CRM?"
      description="You are about to nominate this lead to the CRM."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="md" iconLeft={<Trophy className="h-4 w-4" />} onClick={handleConfirm} loading={submitting}>
            {submitting ? 'Processing...' : 'Confirm Nomination'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold shrink-0">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Human Decision Required</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              By confirming, you are taking responsibility for nominating this opportunity to the ABBE CRM. AI-assisted recommendations do not constitute a final decision.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Company</p>
            <p className="text-sm font-semibold text-foreground">{opp.company}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Contact Person</p>
            <p className="text-sm font-semibold text-foreground">{contactName}</p>
            {contactRole && <p className="text-xs text-muted-foreground mt-0.5">{contactRole}</p>}
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Priority</p>
            <p className="text-sm font-semibold text-foreground">{safePriorityLabel(opp.priority)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Current Review Status</p>
            <p className="text-sm font-semibold text-foreground">{statusLabel}</p>
          </div>
        </div>
        {/* AM FIT / PERSON / TIMING assessments */}
        {amAssessment && (amAssessment.fit || amAssessment.person || amAssessment.timing) && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Account Manager Assessments</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border border-border bg-secondary/20 p-2 flex flex-col gap-1">
                <span className="text-2xs font-semibold text-muted-foreground uppercase">FIT</span>
                <span className="text-sm font-medium text-foreground">{amAssessment.fit || '—'}</span>
              </div>
              <div className="rounded border border-border bg-secondary/20 p-2 flex flex-col gap-1">
                <span className="text-2xs font-semibold text-muted-foreground uppercase">PERSON</span>
                <span className="text-sm font-medium text-foreground">{amAssessment.person || '—'}</span>
              </div>
              <div className="rounded border border-border bg-secondary/20 p-2 flex flex-col gap-1">
                <span className="text-2xs font-semibold text-muted-foreground uppercase">TIMING</span>
                <span className="text-sm font-medium text-foreground">{amAssessment.timing || '—'}</span>
              </div>
            </div>
          </div>
        )}
        {/* AM Findings */}
        {amAssessment?.findings && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Account Manager Findings</p>
            <p className="text-sm text-foreground leading-relaxed">{amAssessment.findings}</p>
          </div>
        )}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-2xs font-bold text-muted-foreground uppercase tracking-wide">Key Evidence</p>
          </div>
          {keyEvidence.length > 0 ? (
            <div className="flex flex-col gap-2">
              {keyEvidence.map((ev) => {
                const sb = evidenceStatusBadge(ev.status);
                const cat = ev.category ?? 'general';
                return (
                  <div key={ev.id} className="flex items-start gap-2.5 rounded border border-border bg-secondary/20 p-2.5">
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold border shrink-0', CATEGORY_COLORS[cat])}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-foreground leading-snug">{ev.statement}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-2xs text-muted-foreground">{ev.source} · {ev.sourceDate}</span>
                        <Badge variant={sb.variant} size="sm">{sb.label}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No evidence has been collected for this opportunity.</p>
          )}
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>Upon confirmation, the opportunity status will change to <span className="font-medium text-foreground">Nominated</span> and the action will be recorded in the opportunity history. No automatic CRM record will be created.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add Note Modal ─── */

function AddNoteModal({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!note.trim() || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(note.trim());
      setNote('');
      setSubmitting(false);
    }, 400);
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Note"
      description="Record a note about this opportunity. Notes are added to the activity history."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="md" iconLeft={<NotebookPen className="h-4 w-4" />} onClick={handleConfirm} disabled={!note.trim() || submitting} loading={submitting}>
            {submitting ? 'Saving...' : 'Add Note'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="note-text" className="text-sm font-medium text-foreground">Note <span className="text-critical">*</span></label>
        <textarea
          id="note-text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          placeholder="Enter your note about this opportunity…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-2xs text-muted-foreground">The note will be visible in the opportunity's activity history.</p>
      </div>
    </Modal>
  );
}

/* ─── Identify Missing Information Modal ─── */

function MissingInfoModal({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (info: string) => void;
}) {
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!info.trim() || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(info.trim());
      setInfo('');
      setSubmitting(false);
    }, 400);
  };

  const handleClose = () => {
    setInfo('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Identify Missing Information"
      description="Flag information that is missing or needs further investigation. This will be recorded in the activity history."
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="md" iconLeft={<AlertCircle className="h-4 w-4" />} onClick={handleConfirm} disabled={!info.trim() || submitting} loading={submitting}>
            {submitting ? 'Logging...' : 'Log Missing Information'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="missing-info" className="text-sm font-medium text-foreground">What information is missing? <span className="text-critical">*</span></label>
        <textarea
          id="missing-info"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          rows={5}
          placeholder="Describe the missing or incomplete information…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-2xs text-muted-foreground">This will flag the opportunity for follow-up and appear in the activity history.</p>
      </div>
    </Modal>
  );
}

/* ─── Route to Department Modal (admin only) ─── */

function RouteToDeptModal({
  open,
  onClose,
  onConfirm,
  opp,
  departmentOptions,
  getDeptLeaderName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (department: string) => void;
  opp: Opportunity;
  departmentOptions: { name: string; leader: string }[];
  getDeptLeaderName: (departmentName: string) => string | null;
}) {
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!selectedDept || submitting) return;
    setSubmitting(true);
    onConfirm(selectedDept);
    setSelectedDept('');
    setSubmitting(false);
  };

  const handleClose = () => {
    setSelectedDept('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Route to Sales Department"
      description={`Select a sales department for ${opp.company} — ${opp.title}. This will assign the opportunity and start the department SLA timer.`}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" size="md" iconLeft={<ArrowRight className="h-4 w-4" />} onClick={handleConfirm} disabled={!selectedDept || submitting} loading={submitting}>
            {submitting ? 'Routing...' : 'Route Opportunity'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {departmentOptions.map(({ name, leader }) => {
          const dept = name;
          const isSelected = selectedDept === dept;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                isSelected
                  ? 'border-gold bg-gold/5 ring-1 ring-gold/30'
                  : 'border-border hover:border-foreground/20 hover:bg-secondary/30'
              )}
            >
              <span className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                isSelected ? 'bg-gold/10 text-gold' : 'bg-secondary text-muted-foreground'
              )}>
                <Building2 className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-semibold text-foreground">{dept}</span>
                <span className="text-xs text-muted-foreground">Sales Leader: {leader}</span>
              </div>
              {isSelected && <CheckCircle2 className="h-5 w-5 text-gold shrink-0" />}
            </button>
          );
        })}
        <p className="text-2xs text-muted-foreground italic">
          Only the two established sales departments are available for routing. Routing cannot be changed to a nonexistent department.
        </p>
      </div>
    </Modal>
  );
}

/* ─── Main Page ─── */

export function OpportunityDetailPage({
  opportunityId,
  onBack,
}: {
  opportunityId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const role = user!.role;
  const { toast } = useToast();
  const { getOpportunity, updateOpportunity, addActivityEvent: addStoreActivity, getAccountManagerName, getDeptLeaderName, getDepartmentNames } = useStore();

  const opp = getOpportunity(opportunityId);
  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    if (!opportunityId) return;
    let cancelled = false;
    setDetailLoading(true);
    fetchOpportunityDetailFromDb(opportunityId)
      .then((d) => { if (!cancelled) { setDetail(d); setDetailLoading(false); } })
      .catch(() => { if (!cancelled) { setDetail(null); setDetailLoading(false); } });
    return () => { cancelled = true; };
  }, [opportunityId]);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [nominationModalOpen, setNominationModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [notNominatableModalOpen, setNotNominatableModalOpen] = useState(false);
  const [deferModalOpen, setDeferModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [deleteTestModalOpen, setDeleteTestModalOpen] = useState(false);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [missingInfoModalOpen, setMissingInfoModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<Status | null>(null);
  const [currentStatus, setCurrentStatus] = useState<Status>(opp?.status ?? 'new');
  const [currentAccountManager, setCurrentAccountManager] = useState<string | null>(opp?.accountManager ?? null);
  const [assignmentRecords, setAssignmentRecords] = useState<AssignmentRecord[]>([]);
  const [reviewRecords, setReviewRecords] = useState<ReviewRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(detail?.timeline ?? []);
  const [amReviewData, setAmReviewData] = useState<AMReviewData>({
    fitAssessment: '',
    personAssessment: '',
    timingAssessment: '',
    findings: '',
    missingInfo: '',
    notes: '',
    reviewStatus: 'not_started',
  });
  const [slaWorkflow, setSlaWorkflow] = useState<SlaWorkflowData>(
    opp?.sla ?? { department: { assignedAt: null, deadline: null, completedAt: null }, review: { assignedAt: null, deadline: null, completedAt: null } },
  );
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    fetchUserByEmail(user.email).then((dbUser) => {
      if (!cancelled && dbUser) setDbUserId(dbUser.id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.email]);

  useEffect(() => {
    if (!opportunityId) return;
    let cancelled = false;
    Promise.all([
      fetchReviews(opportunityId).catch(() => []),
      fetchCrmNominationsByOpportunity(opportunityId).catch(() => []),
    ]).then(([dbReviews, dbNominations]) => {
      if (cancelled) return;
      if (dbReviews.length > 0) {
        setReviewRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const mapped: ReviewRecord[] = dbReviews.map((r) => ({
            id: r.id,
            actor: 'Reviewer',
            action: r.review_status === 'approved' ? 'Submitted as Reviewed' : r.review_status === 'returned' ? 'Returned for Review' : 'Review Saved (Draft)',
            timestamp: new Date(r.reviewed_at ?? r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
            disposition: r.disposition ?? (r.review_status === 'approved' ? 'approved' : r.review_status === 'returned' ? 'returned' : undefined),
            notes: r.comments ?? undefined,
          })).filter((r) => !existingIds.has(r.id));
          return [...mapped, ...prev];
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [opportunityId]);

  const slaStatus = getSlaWorkflowStatus(slaWorkflow, currentStatus);

  if (!opp) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Back to Opportunities
        </Button>
        <Card>
          <EmptyState
            icon={<AlertCircle className="h-6 w-6" />}
            title="Opportunity not found"
            description="This opportunity may have been removed or the ID is invalid."
            action={<Button variant="outline" size="sm" onClick={onBack}>Return to Opportunities</Button>}
          />
        </Card>
      </div>
    );
  }

  const userDept = user?.department ?? '';
  if (role === 'sales_leader' && opp.department !== userDept) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Back to Opportunities
        </Button>
        <Card>
          <EmptyState
            icon={<ShieldX className="h-6 w-6" />}
            title="Access restricted"
            description={`This opportunity belongs to ${opp.department}. You can only view opportunities in your own department (${userDept}).`}
            action={<Button variant="outline" size="sm" onClick={onBack}>Return to Opportunities</Button>}
          />
        </Card>
      </div>
    );
  }
  if (role === 'account_manager' && opp.accountManager !== user?.email) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Back to Opportunities
        </Button>
        <Card>
          <EmptyState
            icon={<ShieldX className="h-6 w-6" />}
            title="Access restricted"
            description="This opportunity is not assigned to you. You can only view opportunities assigned to you."
            action={<Button variant="outline" size="sm" onClick={onBack}>Return to Opportunities</Button>}
          />
        </Card>
      </div>
    );
  }

  const nowTimestamp = () =>
    getNow().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const roleLabel = role === 'administrator' ? 'Administrator' : role === 'sales_leader' ? 'Sales Department' : 'Account Manager';

  const addTimelineEvent = (
    action: string,
    opts?: {
      previousStatus?: string | null;
      newStatus?: string | null;
      reason?: string | null;
      department?: string | null;
      accountManager?: string | null;
    },
  ) => {
    const ts = nowTimestamp();
    setTimelineEvents((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        actor: user!.name,
        action,
        timestamp: ts,
        role: roleLabel,
        previousStatus: opts?.previousStatus ?? null,
        newStatus: opts?.newStatus ?? null,
        reason: opts?.reason ?? null,
        department: opts?.department ?? opp.department,
        accountManager: opts?.accountManager ?? null,
      },
    ]);
    const storeEvent: ActivityEntry = {
      id: `store-evt-${Date.now()}`,
      user: user!.name,
      role: roleLabel,
      action,
      opportunityId: opp.id,
      company: opp.company,
      timestamp: ts,
      previousStatus: opts?.previousStatus ?? null,
      newStatus: opts?.newStatus ?? null,
      reason: opts?.reason ?? null,
      department: opts?.department ?? opp.department,
      accountManager: opts?.accountManager ?? null,
    };
    addStoreActivity(storeEvent);
  };

  const handleAction = (action: string) => {
    if (action === 'assign') {
      setAssignmentModalOpen(true);
      return;
    }
    if (action === 'return_for_review') {
      setReturnModalOpen(true);
      return;
    }
    if (action === 'start_review') {
      const prev = currentStatus;
      const nowIso = getNow().toISOString();
      const newSla: SlaWorkflowData = {
        ...slaWorkflow,
        review: { assignedAt: nowIso, deadline: createDeadline(nowIso), completedAt: null },
      };
      setSlaWorkflow(newSla);
      setCurrentStatus('in_review');
      updateOpportunity(opp.id, { status: 'in_review', sla: newSla });
      addTimelineEvent('Review started', { previousStatus: prev, newStatus: 'in_review', accountManager: currentAccountManager ? (getAccountManagerName(currentAccountManager) ?? currentAccountManager) : null });
      toast({ title: 'Review Started', description: `${opp.company} — ${opp.title}`, variant: 'success' });
      return;
    }
    if (action === 'add_note') {
      setAddNoteModalOpen(true);
      return;
    }
    if (action === 'identify_missing') {
      setMissingInfoModalOpen(true);
      return;
    }
    if (action === 'submit_review') {
      toast({ title: 'Use the Review Workspace', description: 'Complete the assessment fields below in the Review Workspace and click "Submit as Reviewed" there to submit your review.', variant: 'default' });
      const ws = document.getElementById('review-workspace');
      if (ws) ws.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action === 'nominate') {
      setNominationModalOpen(true);
      return;
    }
    if (action === 'acknowledge') {
      const nowIso = getNow().toISOString();
      const newSla: SlaWorkflowData = {
        ...slaWorkflow,
        department: slaWorkflow.department.assignedAt
          ? slaWorkflow.department
          : { assignedAt: nowIso, deadline: createDeadline(nowIso), completedAt: null },
      };
      setSlaWorkflow(newSla);
      const prev = currentStatus;
      setCurrentStatus('dept_viewed');
      updateOpportunity(opp.id, { status: 'dept_viewed', sla: newSla });
      addTimelineEvent('Acknowledged by Sales Department', { previousStatus: prev, newStatus: 'dept_viewed' });
      toast({ title: 'Acknowledged', description: `${opp.company} — ${opp.title}. Department SLA timer started.`, variant: 'success' });
      return;
    }
    if (action === 'defer') {
      setDeferModalOpen(true);
      return;
    }
    if (action === 'not_nominatable') {
      setNotNominatableModalOpen(true);
      return;
    }
    if (action === 'archive') {
      setArchiveModalOpen(true);
      return;
    }
    if (action === 'delete_test_record') {
      setDeleteTestModalOpen(true);
      return;
    }
    if (action === 'route_to_dept') {
      setRouteModalOpen(true);
      return;
    }
  };

  const handleAssignmentConfirm = (record: AssignmentRecord) => {
    const toName = getAccountManagerName(record.assignedTo) ?? record.assignedTo;
    const fromName = record.previousManager
      ? getAccountManagerName(record.previousManager) ?? record.previousManager
      : null;
    setCurrentAccountManager(record.assignedTo);
    setAssignmentRecords((prev) => [record, ...prev]);
    setCurrentStatus('assigned_to_am');
    const nowIso = getNow().toISOString();
    let newSla: SlaWorkflowData;
    if (record.action === 'reassigned') {
      newSla = {
        department: { ...slaWorkflow.department, completedAt: slaWorkflow.department.completedAt ?? nowIso },
        review: { assignedAt: nowIso, deadline: createDeadline(nowIso), completedAt: null },
      };
      setSlaWorkflow(newSla);
      const reasonSuffix = record.reason ? ` — ${record.reason}` : '';
      addTimelineEvent(`Reassigned from ${fromName ?? 'Unassigned'} to ${toName}${reasonSuffix}`, { previousStatus: 'assigned_to_am', newStatus: 'reassigned', reason: record.reason ?? null, accountManager: toName });
    } else {
      newSla = {
        department: { ...slaWorkflow.department, completedAt: nowIso },
        review: { assignedAt: nowIso, deadline: createDeadline(nowIso), completedAt: null },
      };
      setSlaWorkflow(newSla);
      addTimelineEvent(`Assigned to ${toName}`, { previousStatus: 'dept_viewed', newStatus: 'assigned_to_am', accountManager: toName });
    }
    updateOpportunity(opp.id, { status: 'assigned_to_am', accountManager: record.assignedTo, sla: newSla });
    setAssignmentModalOpen(false);
    toast({
      title: record.action === 'reassigned' ? 'Account Manager reassigned successfully.' : 'Assigned',
      description: record.action === 'reassigned'
        ? `${opp.company} — ${fromName ?? 'Unassigned'} → ${toName}. Review SLA reset.`
        : `${opp.company} — Assigned to ${toName}. Review SLA started.`,
      variant: 'success',
    });
  };

  const handleSaveReview = (assessment: ReviewAssessmentData) => {
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Review Saved (Draft)',
      timestamp: nowTimestamp(),
      assessment,
    };
    setReviewRecords((prev) => [record, ...prev]);
    setAmReviewData({
      fitAssessment: assessment.fit,
      personAssessment: assessment.person,
      timingAssessment: assessment.timing,
      findings: assessment.findings,
      missingInfo: assessment.missingInfo,
      notes: assessment.notes,
      reviewStatus: 'in_progress',
    });
    addTimelineEvent('Review saved as draft', { previousStatus: 'in_review', newStatus: 'in_review' });
    createReview({
      opportunity_id: opp.id,
      reviewer_id: dbUserId,
      review_status: 'in_progress',
      disposition: 'draft',
      comments: assessment.findings,
    }).catch((err) => console.error('Failed to save review to DB:', err));
    toast({ title: 'Review Saved', description: `${opp.company} — Draft saved.`, variant: 'success' });
  };

  const handleSubmitReview = (assessment: ReviewAssessmentData) => {
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Submitted as Reviewed',
      timestamp: nowTimestamp(),
      assessment,
    };
    setReviewRecords((prev) => [record, ...prev]);
    setAmReviewData({
      fitAssessment: assessment.fit,
      personAssessment: assessment.person,
      timingAssessment: assessment.timing,
      findings: assessment.findings,
      missingInfo: assessment.missingInfo,
      notes: assessment.notes,
      reviewStatus: 'completed',
    });
    setCurrentStatus('reviewed');
    const newSla: SlaWorkflowData = { ...slaWorkflow, review: { ...slaWorkflow.review, completedAt: getNow().toISOString() } };
    setSlaWorkflow(newSla);
    updateOpportunity(opp.id, { status: 'reviewed', sla: newSla });
    addTimelineEvent('Submitted as Reviewed — ready for Administrator decision', { previousStatus: 'in_review', newStatus: 'reviewed' });
    createReview({
      opportunity_id: opp.id,
      reviewer_id: dbUserId,
      review_status: 'approved',
      disposition: 'approved',
      comments: assessment.findings,
      reviewed_at: new Date().toISOString(),
    }).catch((err) => console.error('Failed to submit review to DB:', err));
    toast({ title: 'Submitted as Reviewed', description: `${opp.company} — ${opp.title} is now ready for Administrator decision.`, variant: 'success' });
  };

  const handleReturnConfirm = (reason: string, notes: string) => {
    const prevStatus = currentStatus;
    setPreviousStatus(prevStatus);
    setCurrentStatus('returned_for_review');
    updateOpportunity(opp.id, { status: 'returned_for_review' });
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Returned for Review',
      timestamp: nowTimestamp(),
      reason,
      notes,
      previousStatus: prevStatus,
      disposition: reason,
      decisionDate: nowTimestamp(),
      decisionMaker: user!.name,
    };
    setReviewRecords((prev) => [record, ...prev]);
    setAmReviewData((prev) => ({ ...prev, reviewStatus: 'returned' }));
    addTimelineEvent(`Returned for Review: ${reason}`, { previousStatus: prevStatus, newStatus: 'returned_for_review', reason });
    createReview({
      opportunity_id: opp.id,
      reviewer_id: dbUserId,
      review_status: 'returned',
      disposition: reason,
      comments: notes || undefined,
      reviewed_at: new Date().toISOString(),
    }).catch((err) => console.error('Failed to save return review to DB:', err));
    toast({
      title: 'Returned for Review',
      description: `${opp.company} — Reason: ${reason}${notes ? ` — ${notes}` : ''}`,
      variant: 'warning',
    });
    setReturnModalOpen(false);
  };

  const handleNotNominatableConfirm = (reason: string, notes: string) => {
    const prevStatus = currentStatus;
    setPreviousStatus(prevStatus);
    setCurrentStatus('not_nominatable');
    updateOpportunity(opp.id, { status: 'not_nominatable' });
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Marked as Not Nominatable',
      timestamp: nowTimestamp(),
      reason,
      notes,
      previousStatus: prevStatus,
      disposition: reason,
      decisionDate: nowTimestamp(),
      decisionMaker: user!.name,
    };
    setReviewRecords((prev) => [record, ...prev]);
    addTimelineEvent(`Marked as Not Nominatable: ${reason}`, { previousStatus: prevStatus, newStatus: 'not_nominatable', reason });
    toast({
      title: 'Lead marked as Not Nominatable.', description: `${opp.company} — ${opp.title} has been marked as not nominatable (${reason}).`, variant: 'warning' });
    setNotNominatableModalOpen(false);
  };

  const handleDeferConfirm = (reason: string, followUpDate: string, notes: string) => {
    const prevStatus = currentStatus;
    setPreviousStatus(prevStatus);
    setCurrentStatus('deferred');
    updateOpportunity(opp.id, { status: 'deferred' });
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Deferred',
      timestamp: nowTimestamp(),
      reason,
      notes,
      previousStatus: prevStatus,
      disposition: 'Deferred',
      decisionDate: nowTimestamp(),
      decisionMaker: user!.name,
    };
    setReviewRecords((prev) => [record, ...prev]);
    const dateSuffix = followUpDate ? ` — Follow-up: ${followUpDate}` : '';
    addTimelineEvent(`Deferred: ${reason}${dateSuffix}`, { previousStatus: prevStatus, newStatus: 'deferred', reason });
    toast({ title: 'Lead deferred successfully.', description: `${opp.company} — ${opp.title} has been deferred (${reason}).${dateSuffix}`, variant: 'warning' });
    setDeferModalOpen(false);
  };

  const handleNominateConfirm = () => {
    const prevStatus = currentStatus;
    setPreviousStatus(prevStatus);
    setCurrentStatus('nominated');
    updateOpportunity(opp.id, { status: 'nominated' });
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Nominated to ABBE CRM',
      timestamp: nowTimestamp(),
      previousStatus: prevStatus,
      disposition: 'Nominated',
      decisionDate: nowTimestamp(),
      decisionMaker: user!.name,
    };
    setReviewRecords((prev) => [record, ...prev]);
    addTimelineEvent('Nominated to ABBE CRM', { previousStatus: prevStatus, newStatus: 'nominated' });
    createCrmNomination({
      opportunity_id: opp.id,
      nominated_by: dbUserId,
      status: 'nominated',
    }).catch((err) => console.error('Failed to create CRM nomination:', err));
    toast({
      title: 'Lead nominated to CRM.',
      description: `${opp.company} — ${opp.title} has been nominated to the ABBE CRM.`,
      variant: 'success',
    });
    setNominationModalOpen(false);
  };

  const handleArchiveConfirm = (reason: string, notes: string) => {
    const prevStatus = currentStatus;
    setPreviousStatus(prevStatus);
    setCurrentStatus('archived');
    updateOpportunity(opp.id, { status: 'archived' });
    const record: ReviewRecord = {
      id: `rev-${Date.now()}`,
      actor: user!.name,
      action: 'Archived',
      timestamp: nowTimestamp(),
      reason,
      notes,
      previousStatus: prevStatus,
      disposition: reason,
      decisionDate: nowTimestamp(),
      decisionMaker: user!.name,
    };
    setReviewRecords((prev) => [record, ...prev]);
    addTimelineEvent(`Archived: ${reason}`, { previousStatus: prevStatus, newStatus: 'archived', reason });
    toast({ title: 'Archived', description: `${opp.company} — ${opp.title} has been archived (${reason}).`, variant: 'warning' });
    setArchiveModalOpen(false);
  };

  const handleDeleteTestConfirm = () => {
    addTimelineEvent('Test record deleted by Administrator (prototype only)', { previousStatus: currentStatus, newStatus: null });
    toast({ title: 'Test Record Deleted', description: `${opp.company} — Test record removed from prototype.`, variant: 'warning' });
    setDeleteTestModalOpen(false);
    onBack();
  };

  const handleRouteConfirm = (department: string) => {
    const prev = currentStatus;
    const nowIso = getNow().toISOString();
    const newSla: SlaWorkflowData = {
      ...slaWorkflow,
      department: { assignedAt: nowIso, deadline: createDeadline(nowIso), completedAt: null },
    };
    setSlaWorkflow(newSla);
    setCurrentStatus('assigned_to_dept');
    updateOpportunity(opp.id, { department, status: 'assigned_to_dept', sla: newSla });
    addTimelineEvent(`Routed to ${department}`, { previousStatus: prev, newStatus: 'assigned_to_dept', department });
    toast({
      title: 'Opportunity routed',
      description: `${opp.company} — ${opp.title} has been routed to ${department}.`,
      variant: 'success',
    });
    setRouteModalOpen(false);
  };

  const handleAddNoteConfirm = (note: string) => {
    addTimelineEvent(`Note added: ${note.slice(0, 80)}${note.length > 80 ? '…' : ''}`, { previousStatus: currentStatus, newStatus: currentStatus });
    toast({ title: 'Note Added', description: `${opp.company} — Your note has been recorded.`, variant: 'success' });
    setAddNoteModalOpen(false);
  };

  const handleMissingInfoConfirm = (missingInfo: string) => {
    addTimelineEvent(`Missing information identified: ${missingInfo.slice(0, 80)}${missingInfo.length > 80 ? '…' : ''}`, { previousStatus: currentStatus, newStatus: currentStatus, reason: missingInfo });
    toast({ title: 'Missing Information Logged', description: `${opp.company} — Missing information has been flagged for follow-up.`, variant: 'warning' });
    setMissingInfoModalOpen(false);
  };

  const currentOpp: Opportunity = { ...opp, accountManager: currentAccountManager, status: currentStatus, sla: slaWorkflow };

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Breadcrumb
          items={[
            { label: 'Opportunities', onClick: onBack },
            { label: opp.company },
          ]}
        />
        <Button variant="outline" size="sm" iconLeft={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Back
        </Button>
      </div>

      {/* SECTION 1 — Lead Header */}
      <LeadHeaderSection opp={currentOpp} status={currentStatus} detail={detail} slaStatus={slaStatus} getDeptLeaderName={getDeptLeaderName} getAccountManagerName={getAccountManagerName} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* SECTION 2 — Contact Person */}
          <ContactPersonSection detail={detail} opp={currentOpp} />

          {/* SECTION 3 — Lead Intelligence */}
          <LeadIntelligenceSection detail={detail} opp={currentOpp} />

          {/* SECTION 3b — Screening (40/30/30) */}
          {detail && <ScreeningSection detail={detail} />}

          {/* SECTION 3c — Gatekeeper */}
          {detail && <GatekeeperSection detail={detail} />}

          {/* SECTION 3d — Why Was This Identified? */}
          {detail && <WhyIdentifiedSection detail={detail} />}

          {/* SECTION 4 — Evidence */}
          {detail && <EvidenceSection detail={detail} />}

          {/* SECTION 4b — Research Summary */}
          {detail && <ResearchSummarySection detail={detail} />}

          {/* SECTION 4c — AI Findings */}
          {detail && <AiFindingsSection detail={detail} />}

          {/* SECTION 5 — Account Manager Review */}
          <AccountManagerReviewSection reviewData={amReviewData} reviewRecords={reviewRecords} />

          {/* Review Workspace (existing interactive component) */}
          <ReviewWorkspace
            status={currentStatus}
            role={role}
            actorName={user!.name}
            slaWorkflow={slaWorkflow}
            onSaveReview={handleSaveReview}
            onSubmitReview={handleSubmitReview}
            onReturnForReview={() => setReturnModalOpen(true)}
            onRestartReview={() => { const prev = currentStatus; setCurrentStatus('in_review'); addTimelineEvent('Review restarted', { previousStatus: prev, newStatus: 'in_review' }); }}
            reviewHistory={reviewRecords}
            containerId="review-workspace"
          />

          {/* SECTION 7 — Activity / Audit History */}
          <ActivityHistorySection events={timelineEvents} />
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* SLA Workflow Panel */}
          <SlaWorkflowPanel workflow={slaWorkflow} status={slaStatus} />

          {/* SECTION 6 — Ownership */}
          <OwnershipSection opp={currentOpp} currentAccountManager={currentAccountManager} assignmentRecords={assignmentRecords} slaStatus={slaStatus} getDeptLeaderName={getDeptLeaderName} getAccountManagerName={getAccountManagerName} />

          {/* SECTION 8 — Actions */}
          <ActionsSection role={role} status={currentStatus} onAction={handleAction} />

          {/* Key dates */}
          <Card className="p-4">
            <div className="flex flex-col gap-3">
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">Key Dates</p>
              <div className="rounded-lg border border-border p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Date Surfaced</span>
                  <span className="text-sm font-medium text-foreground">{detail?.overview.dateSurfaced ?? opp.discoveredDate}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium text-foreground">{opp.lastUpdated}</span>
                </div>
                {detail?.timing.triggerDate && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Trigger Date</span>
                    <span className="text-sm font-medium text-foreground tabular-nums">{formatSlaTimestamp(detail.timing.triggerDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Info notice */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                <Info className="h-4 w-4" />
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This dossier presents intelligence for human review. AI-assisted recommendations do not constitute a final decision. All evidence should be verified before progressing toward CRM nomination.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky Action Bar — primary review actions always accessible */}
      <StickyActionBar
        role={role}
        status={currentStatus}
        onAction={handleAction}
      />

      {/* Return for Review Modal */}
      <ReturnForReviewModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onConfirm={handleReturnConfirm}
        reasons={role === 'administrator' ? ADMIN_RETURN_REASONS : AM_RETURN_REASONS}
        isAdmin={role === 'administrator'}
      />

      {/* Nomination Confirmation Modal */}
      <NominationConfirmModal
        open={nominationModalOpen}
        onClose={() => setNominationModalOpen(false)}
        onConfirm={handleNominateConfirm}
        opp={currentOpp}
        detail={detail}
        statusLabel="Ready for Administrator Decision"
        reviewRecords={reviewRecords}
      />

      {/* Not Nominatable Modal */}
      <NotNominatableModal
        open={notNominatableModalOpen}
        onClose={() => setNotNominatableModalOpen(false)}
        onConfirm={handleNotNominatableConfirm}
      />

      {/* Defer Modal */}
      <DeferModal
        open={deferModalOpen}
        onClose={() => setDeferModalOpen(false)}
        onConfirm={handleDeferConfirm}
      />

      {/* Archive Modal */}
      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleArchiveConfirm}
        opp={currentOpp}
      />

      {/* Delete Test Record Modal (admin only) */}
      {role === 'administrator' && (
        <DeleteTestRecordModal
          open={deleteTestModalOpen}
          onClose={() => setDeleteTestModalOpen(false)}
          onConfirm={handleDeleteTestConfirm}
          opp={currentOpp}
        />
      )}

      {/* Add Note Modal */}
      <AddNoteModal
        open={addNoteModalOpen}
        onClose={() => setAddNoteModalOpen(false)}
        onConfirm={handleAddNoteConfirm}
      />

      {/* Identify Missing Information Modal */}
      <MissingInfoModal
        open={missingInfoModalOpen}
        onClose={() => setMissingInfoModalOpen(false)}
        onConfirm={handleMissingInfoConfirm}
      />

      {/* Assignment Modal */}
      <AssignmentModal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onConfirm={handleAssignmentConfirm}
        opportunity={currentOpp}
        previousAssignments={assignmentRecords}
      />

      {/* Route to Department Modal (admin only) */}
      <RouteToDeptModal
        open={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        onConfirm={handleRouteConfirm}
        opp={currentOpp}
        departmentOptions={getDepartmentNames().map((name) => ({ name, leader: getDeptLeaderName(name) ?? 'Unassigned' }))}
        getDeptLeaderName={getDeptLeaderName}
      />
    </div>
  );
}
