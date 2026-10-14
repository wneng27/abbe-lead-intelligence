import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardContent,
  SectionHeader,
  Button,
  Badge,
  Select,
  type SelectOption,
} from '@/components/ui';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Undo2,
  AlertCircle,
  Save,
  FileSearch,
  Clock,
  Timer,
} from 'lucide-react';
import type { Status } from '@/lib/tokens';
import { getSlaStatus, computeTimeRemaining, formatSlaTimestamp, getNow, type SlaWorkflowData } from '@/lib/sla';

export type FitAssessment = 'Strong' | 'Moderate' | 'Weak';
export type PersonAssessment = 'Verified' | 'Identified' | 'Partial' | 'Unknown';
export type TimingAssessment = 'Recent Trigger' | 'Upcoming Event' | 'Ongoing' | 'Stale' | 'Unknown';

export interface ReviewAssessmentData {
  fit: FitAssessment | '';
  person: PersonAssessment | '';
  timing: TimingAssessment | '';
  findings: string;
  notes: string;
  missingInfo: string;
  evidenceReviewed: boolean;
}

export interface ReviewRecord {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  assessment?: ReviewAssessmentData;
  reason?: string;
  notes?: string;
  previousStatus?: string;
  disposition?: string;
  decisionDate?: string;
  decisionMaker?: string;
}

export interface ReviewWorkspaceProps {
  status: Status;
  role: string;
  actorName: string;
  slaWorkflow: SlaWorkflowData;
  onSaveReview: (assessment: ReviewAssessmentData) => void;
  onSubmitReview: (assessment: ReviewAssessmentData) => void;
  onReturnForReview: () => void;
  onRestartReview?: () => void;
  reviewHistory: ReviewRecord[];
  containerId?: string;
}

const FIT_OPTIONS: SelectOption[] = [
  { value: 'Strong', label: 'Strong' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Weak', label: 'Weak' },
];

const PERSON_OPTIONS: SelectOption[] = [
  { value: 'Verified', label: 'Verified' },
  { value: 'Identified', label: 'Identified' },
  { value: 'Partial', label: 'Partial' },
  { value: 'Unknown', label: 'Unknown' },
];

const TIMING_OPTIONS: SelectOption[] = [
  { value: 'Recent Trigger', label: 'Recent Trigger' },
  { value: 'Upcoming Event', label: 'Upcoming Event' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Stale', label: 'Stale' },
  { value: 'Unknown', label: 'Unknown' },
];

const DEFAULT_ASSESSMENT: ReviewAssessmentData = {
  fit: '',
  person: '',
  timing: '',
  findings: '',
  notes: '',
  missingInfo: '',
  evidenceReviewed: false,
};

const ASSESSMENT_BADGE: Record<string, { variant: 'success' | 'warning' | 'default' | 'critical'; label: string }> = {
  Strong: { variant: 'success', label: 'Strong' },
  Moderate: { variant: 'default', label: 'Moderate' },
  Weak: { variant: 'critical', label: 'Weak' },
  Verified: { variant: 'success', label: 'Verified' },
  Identified: { variant: 'default', label: 'Identified' },
  Partial: { variant: 'warning', label: 'Partial' },
  Unknown: { variant: 'default', label: 'Unknown' },
  'Recent Trigger': { variant: 'success', label: 'Recent Trigger' },
  'Upcoming Event': { variant: 'warning', label: 'Upcoming Event' },
  Ongoing: { variant: 'default', label: 'Ongoing' },
  Stale: { variant: 'critical', label: 'Stale' },
};

export function ReviewWorkspace({
  status,
  role,
  actorName,
  slaWorkflow,
  onSaveReview,
  onSubmitReview,
  onReturnForReview,
  onRestartReview,
  reviewHistory,
  containerId,
}: ReviewWorkspaceProps) {
  const [assessment, setAssessment] = useState<ReviewAssessmentData>(DEFAULT_ASSESSMENT);
  const [showErrors, setShowErrors] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const canReview = role === 'account_manager' || role === 'administrator';
  const isInReview = status === 'in_review';
  const isReturned = status === 'returned_for_review';
  const isActive = isInReview || isReturned;

  const reviewSla = useMemo(() => {
    const slaStatus = getSlaStatus(slaWorkflow, status, getNow());
    if (slaStatus.activeStage === 'review' && slaWorkflow.review.assignedAt) {
      return {
        startedAt: slaWorkflow.review.assignedAt,
        deadline: slaWorkflow.review.deadline,
        timeRemaining: computeTimeRemaining(slaWorkflow.review.deadline, getNow()),
        state: slaStatus.currentState,
      };
    }
    return null;
  }, [slaWorkflow, status]);

  const requiredFieldsValid = useMemo(() => {
    return !!(
      assessment.fit &&
      assessment.person &&
      assessment.timing &&
      assessment.findings.trim() &&
      assessment.notes.trim() &&
      assessment.evidenceReviewed
    );
  }, [assessment]);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!assessment.fit) missing.push('FIT assessment');
    if (!assessment.person) missing.push('PERSON assessment');
    if (!assessment.timing) missing.push('TIMING assessment');
    if (!assessment.findings.trim()) missing.push('Findings');
    if (!assessment.notes.trim()) missing.push('Notes');
    if (!assessment.evidenceReviewed) missing.push('Evidence reviewed confirmation');
    return missing;
  }, [assessment]);

  const handleSave = () => {
    onSaveReview(assessment);
    setSavedAt(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
  };

  const handleSubmit = () => {
    setShowErrors(true);
    if (requiredFieldsValid) {
      onSubmitReview(assessment);
    }
  };

  const handleRestart = () => {
    setAssessment(DEFAULT_ASSESSMENT);
    setShowErrors(false);
    setSavedAt(null);
    onRestartReview?.();
  };

  const completedFields = [
    !!assessment.fit,
    !!assessment.person,
    !!assessment.timing,
    !!assessment.findings.trim(),
    !!assessment.notes.trim(),
    !!assessment.evidenceReviewed,
  ].filter(Boolean).length;

  const progress = Math.round((completedFields / 6) * 100);

  return (
    <div id={containerId}>
    <Card>
      <CardHeader>
        <SectionHeader
          title="Review Workspace"
          description="Evaluate FIT, PERSON, and TIMING. Document findings and confirm evidence review."
          icon={<ClipboardCheck className="h-4 w-4" />}
          actions={
            isActive && canReview ? (
              <Badge variant={requiredFieldsValid ? 'success' : 'warning'} dot>
                {progress}% Complete
              </Badge>
            ) : undefined
          }
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Review status banner */}
        {reviewSla && isActive && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border bg-secondary/20 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <Play className="h-3 w-3" /> Review Started
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">{formatSlaTimestamp(reviewSla.startedAt)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <Timer className="h-3 w-3" /> Deadline
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">{formatSlaTimestamp(reviewSla.deadline)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time Remaining
              </span>
              <span className={cn('text-xs font-medium tabular-nums', reviewSla.timeRemaining.isOverdue ? 'text-critical dark:text-critical-light' : 'text-foreground')}>
                {reviewSla.timeRemaining.label}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Review Status</span>
              <Badge variant={reviewSla.state === 'breached' ? 'critical' : reviewSla.state === 'completed' ? 'success' : 'warning'} size="sm" dot>
                {reviewSla.state === 'breached' ? 'Breached' : reviewSla.state === 'completed' ? 'Completed' : 'Active'}
              </Badge>
            </div>
          </div>
        )}

        {/* Assessment selectors */}
        {isActive && canReview && (
          <>
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Required Assessments</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AssessmentSelect
                  label="FIT"
                  description="Company relevance to ABBE"
                  value={assessment.fit}
                  options={FIT_OPTIONS}
                  onChange={(v) => setAssessment({ ...assessment, fit: v as FitAssessment })}
                  error={showErrors && !assessment.fit ? 'FIT assessment is required' : undefined}
                  disabled={!isActive}
                />
                <AssessmentSelect
                  label="PERSON"
                  description="Decision-maker identification"
                  value={assessment.person}
                  options={PERSON_OPTIONS}
                  onChange={(v) => setAssessment({ ...assessment, person: v as PersonAssessment })}
                  error={showErrors && !assessment.person ? 'PERSON assessment is required' : undefined}
                  disabled={!isActive}
                />
                <AssessmentSelect
                  label="TIMING"
                  description="Engagement window"
                  value={assessment.timing}
                  options={TIMING_OPTIONS}
                  onChange={(v) => setAssessment({ ...assessment, timing: v as TimingAssessment })}
                  error={showErrors && !assessment.timing ? 'TIMING assessment is required' : undefined}
                  disabled={!isActive}
                />
              </div>
            </div>

            {/* Findings & Notes & Missing Info */}
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Review Details</p>
              <div className="flex flex-col gap-3">
                <ReviewField
                  label="Findings"
                  required
                  value={assessment.findings}
                  onChange={(v) => setAssessment({ ...assessment, findings: v })}
                  placeholder="Key findings from your review of the evidence and assessments..."
                  error={showErrors && !assessment.findings.trim() ? 'Findings are required' : undefined}
                  disabled={!isActive}
                />
                <ReviewField
                  label="Notes"
                  required
                  value={assessment.notes}
                  onChange={(v) => setAssessment({ ...assessment, notes: v })}
                  placeholder="Additional notes, context, or observations from the review..."
                  error={showErrors && !assessment.notes.trim() ? 'Notes are required' : undefined}
                  disabled={!isActive}
                />
                <ReviewField
                  label="Missing Information"
                  value={assessment.missingInfo}
                  onChange={(v) => setAssessment({ ...assessment, missingInfo: v })}
                  placeholder="Any information gaps or missing evidence identified during review (optional)..."
                  disabled={!isActive}
                />
              </div>
            </div>

            {/* Evidence reviewed checkbox */}
            <div>
              <label
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
                  assessment.evidenceReviewed
                    ? 'border-success/30 bg-success/5'
                    : showErrors
                      ? 'border-critical/30 bg-critical/5'
                      : 'border-border hover:bg-secondary/50',
                )}
              >
                <input
                  type="checkbox"
                  checked={assessment.evidenceReviewed}
                  onChange={(e) => setAssessment({ ...assessment, evidenceReviewed: e.target.checked })}
                  className="h-4 w-4 mt-0.5 accent-foreground"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                    <FileSearch className="h-3.5 w-3.5" />
                    Evidence Reviewed <span className="text-critical">*</span>
                  </span>
                  <span className="text-xs text-muted-foreground">I have reviewed all evidence items and verified their relevance to the assessment.</span>
                  {showErrors && !assessment.evidenceReviewed && (
                    <span className="text-xs text-critical dark:text-critical-light mt-0.5">You must confirm evidence has been reviewed.</span>
                  )}
                </div>
              </label>
            </div>

            {/* Validation errors summary */}
            {showErrors && missingFields.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-critical/20 bg-critical/5 p-3">
                <AlertTriangle className="h-4 w-4 text-critical dark:text-critical-light shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-critical dark:text-critical-light">Required fields missing:</p>
                  <p className="text-xs text-muted-foreground">{missingFields.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Saved indicator */}
            {savedAt && !showErrors && (
              <div className="flex items-center gap-2 text-xs text-success">
                <Save className="h-3.5 w-3.5" />
                <span>Draft saved at {savedAt}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {isInReview && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    iconLeft={<CheckCircle2 className="h-4 w-4" />}
                    onClick={handleSubmit}
                    className="w-full justify-center"
                  >
                    Submit as Reviewed
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    iconLeft={<Save className="h-4 w-4" />}
                    onClick={handleSave}
                    className="w-full justify-center"
                  >
                    Save Review
                  </Button>
                </>
              )}
              {isReturned && (
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={<Play className="h-4 w-4" />}
                  onClick={handleRestart}
                  className="w-full justify-center"
                >
                  Restart Review
                </Button>
              )}
              <Button
                variant="outline"
                size="md"
                iconLeft={<Undo2 className="h-4 w-4" />}
                onClick={onReturnForReview}
                className={cn('w-full justify-center', 'text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5')}
              >
                Return for Review
              </Button>
            </div>
          </>
        )}

        {/* Read-only view when not active */}
        {!isActive && reviewHistory.length > 0 && reviewHistory[0]?.assessment && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Assessments</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ReadOnlyAssessment label="FIT" value={reviewHistory[0].assessment.fit} />
                <ReadOnlyAssessment label="PERSON" value={reviewHistory[0].assessment.person} />
                <ReadOnlyAssessment label="TIMING" value={reviewHistory[0].assessment.timing} />
              </div>
            </div>
            {reviewHistory[0].assessment.findings && (
              <ReadOnlyField label="Findings" value={reviewHistory[0].assessment.findings} />
            )}
            {reviewHistory[0].assessment.notes && (
              <ReadOnlyField label="Notes" value={reviewHistory[0].assessment.notes} />
            )}
            {reviewHistory[0].assessment.missingInfo && (
              <ReadOnlyField label="Missing Information" value={reviewHistory[0].assessment.missingInfo} />
            )}
          </div>
        )}

        {/* Review history */}
        {reviewHistory.length > 0 && (
          <div>
            <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Review History</p>
            <div className="flex flex-col gap-2">
              {reviewHistory.map((rec) => (
                <div key={rec.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {rec.action.includes('Submitted') || rec.action.includes('Reviewed') ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : rec.action.includes('Returned') ? (
                      <Undo2 className="h-3.5 w-3.5 text-critical" />
                    ) : rec.action.includes('Saved') ? (
                      <Save className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-warning" />
                    )}
                    <span className="text-sm font-medium text-foreground">{rec.action}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    by {rec.actor} · {rec.timestamp}
                  </p>
                  {rec.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Reason:</span> {rec.reason}
                    </p>
                  )}
                  {rec.assessment?.findings && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Findings:</span> {rec.assessment.findings}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submitting as Reviewed completes the Account Manager review and moves this lead to the Administrator's "Ready for Administrator Decision" section. The Account Manager cannot nominate to CRM — that decision belongs to the Administrator.
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

function AssessmentSelect({
  label,
  description,
  value,
  options,
  onChange,
  error,
  disabled,
}: {
  label: string;
  description: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-2xs text-muted-foreground">{description}</span>
      </div>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        placeholder={`Select ${label}...`}
        error={error}
        disabled={disabled}
        ariaLabel={label}
      />
    </div>
  );
}

function ReadOnlyAssessment({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  const badge = ASSESSMENT_BADGE[value] ?? { variant: 'default' as const, label: value };
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-1">
      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-1">
      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground leading-relaxed">{value}</span>
    </div>
  );
}

function ReviewField({
  label,
  required,
  value,
  onChange,
  placeholder,
  error,
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={`review-field-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium text-foreground mb-1.5 block">
        {label} {required && <span className="text-critical">*</span>}
      </label>
      <textarea
        id={`review-field-${label.toLowerCase().replace(/\s+/g, '-')}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-critical/40 focus:ring-critical/30' : 'border-input hover:border-muted-foreground/30',
        )}
      />
      {error && <p className="text-xs text-critical dark:text-critical-light mt-1">{error}</p>}
    </div>
  );
}
