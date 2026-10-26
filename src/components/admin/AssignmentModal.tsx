import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Modal,
  Button,
  Avatar,
  Badge,
  Select,
  type SelectOption,
} from "@/components/ui";
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Building2,
  Timer,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  PRIORITY_SHORT,
  PRIORITY_LABELS,
  type Opportunity,
} from "@/lib/opportunities";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  getSlaStatus,
  SLA_STATE_CONFIG,
  getNow,
  formatSlaTimestamp,
} from "@/lib/sla";
import { SlaBadge } from "@/components/ui/Sla";
import { StatusBadge } from "@/components/ui";

export interface AssignmentRecord {
  id: string;
  opportunityId: string;
  assignedBy: string;
  assignedTo: string;
  previousManager: string | null;
  reason: string;
  timestamp: string;
  action: "assigned" | "reassigned";
}

const REASSIGN_REASONS = [
  "Current Account Manager unavailable",
  "SLA risk",
  "Workload balancing",
  "Incorrect assignment",
  "Other",
] as const;

interface AmWorkload {
  email: string;
  name: string;
  activeLeads: number;
  approachingDeadline: number;
}

function computeWorkload(
  allOpps: Opportunity[],
  ams: { email: string; name: string }[],
  excludeOpportunityId?: string,
): AmWorkload[] {
  const activeStatuses = [
    "assigned_to_am",
    "in_review",
    "returned_for_review",
    "reviewed",
    "ready_for_admin",
  ];
  return ams.map((am) => {
    const assigned = allOpps.filter(
      (o) =>
        o.accountManager === am.email &&
        activeStatuses.includes(o.status) &&
        o.id !== excludeOpportunityId,
    );
    const approaching = assigned.filter((o) => {
      const sla = getSlaStatus(o.sla, o.status, getNow());
      return (
        sla.currentState === "approaching" ||
        sla.currentState === "due_soon" ||
        sla.currentState === "breached"
      );
    });
    return {
      email: am.email,
      name: am.name,
      activeLeads: assigned.length,
      approachingDeadline: approaching.length,
    };
  });
}

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (record: AssignmentRecord) => void;
  opportunity: Opportunity;
  previousAssignments: AssignmentRecord[];
}

export function AssignmentModal({
  open,
  onClose,
  onConfirm,
  opportunity,
  previousAssignments,
}: AssignmentModalProps) {
  const { user } = useAuth();
  const {
    getOpportunities,
    getAccountManagerName,
    getDeptLeaderName,
    getAccountManagersInDept,
  } = useStore();
  const [selectedAM, setSelectedAM] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  const isReassignment = !!opportunity.accountManager;
  const currentAMName = opportunity.accountManager
    ? (getAccountManagerName(opportunity.accountManager) ??
      opportunity.accountManager)
    : null;

  const availableAMs = useMemo(() => {
    const dept = opportunity?.departmentId;

    if (!dept) return [];

    return getAccountManagersInDept(dept).filter(
      (am) => am.email !== opportunity.accountManager,
    );
  }, [
    opportunity?.departmentId,
    opportunity.accountManager,
    getAccountManagersInDept,
  ]);

  const workloads = useMemo(
    () => computeWorkload(getOpportunities(), availableAMs, opportunity.id),
    [getOpportunities, availableAMs, opportunity.id],
  );

  const amOptions: SelectOption[] = availableAMs.map((am) => {
    return {
      value: am.id,
      label: am.name,
    };
  });

  const slaStatus = getSlaStatus(opportunity.sla, opportunity.status, getNow());
  const slaConfig = SLA_STATE_CONFIG[slaStatus.currentState];

  const handleClose = () => {
    setSelectedAM("");
    setReason("");
    setCustomReason("");
    setError("");
    setShowFinalConfirm(false);
    onClose();
  };

  const finalReasonText = isReassignment
    ? reason === "Other"
      ? customReason.trim()
      : reason
    : "Initial assignment";
  const newAMName = selectedAM
    ? (getAccountManagerName(selectedAM) ?? selectedAM)
    : null;

  const handleConfirm = () => {
    if (!selectedAM) {
      setError("Please select an Account Manager.");
      return;
    }
    if (isReassignment && !reason) {
      setError("A reason is required for reassignment.");
      return;
    }
    if (isReassignment && reason === "Other" && !customReason.trim()) {
      setError("Please specify the reason for reassignment.");
      return;
    }
    if (isReassignment) {
      setShowFinalConfirm(true);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const now = getNow();
    const finalReason = isReassignment
      ? reason === "Other"
        ? customReason.trim()
        : reason
      : "Initial assignment";

    const record: AssignmentRecord = {
      id: `asg-${Date.now()}`,
      opportunityId: opportunity.id,
      assignedBy: user!.name,
      assignedTo: selectedAM,
      previousManager: opportunity.accountManager,
      reason: finalReason,
      timestamp: now.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      action: isReassignment ? "reassigned" : "assigned",
    };

    onConfirm(record);
    setSelectedAM("");
    setReason("");
    setCustomReason("");
    setError("");
    setSubmitting(false);
  };

  const handleFinalConfirm = () => {
    if (submitting) return;
    setSubmitting(true);
    const now = getNow();
    const record: AssignmentRecord = {
      id: `asg-${Date.now()}`,
      opportunityId: opportunity.id,
      assignedBy: user!.name,
      assignedTo: selectedAM,
      previousManager: opportunity.accountManager,
      reason: finalReasonText,
      timestamp: now.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      action: "reassigned",
    };

    onConfirm(record);
    setSelectedAM("");
    setReason("");
    setCustomReason("");
    setError("");
    setShowFinalConfirm(false);
    setSubmitting(false);
  };

  const selectedWorkload = workloads.find((w) => w.email === selectedAM);

  return (
    <>
      {/* Final confirmation dialog for reassignment */}
      {isReassignment && (
        <Modal
          open={showFinalConfirm}
          onClose={() => setShowFinalConfirm(false)}
          title="Confirm Reassignment"
          description="Please review the details below before confirming the reassignment."
          size="lg"
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                iconLeft={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setShowFinalConfirm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                iconLeft={<CheckCircle2 className="h-4 w-4" />}
                onClick={handleFinalConfirm}
                loading={submitting}
              >
                {submitting ? "Processing..." : "Confirm Reassignment"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold shrink-0">
                <AlertCircle className="h-4 w-4" />
              </span>
              <p className="text-sm text-foreground leading-relaxed">
                You are about to reassign this opportunity from the current
                Account Manager to a new one. The review SLA timer will be reset
                for the new Account Manager.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Current Account Manager
                </p>
                <div className="flex items-center gap-2">
                  <Avatar name={currentAMName ?? "?"} size="sm" />
                  <span className="text-sm font-medium text-foreground">
                    {currentAMName ?? "Unassigned"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                  New Account Manager
                </p>
                <div className="flex items-center gap-2">
                  <Avatar name={newAMName ?? "?"} size="sm" />
                  <span className="text-sm font-medium text-foreground">
                    {newAMName}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 flex flex-col gap-1">
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Reason
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {finalReasonText}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                This action will be recorded in the assignment history and
                activity timeline. The previous Account Manager will no longer
                have access to this opportunity.
              </p>
            </div>
          </div>
        </Modal>
      )}
      <Modal
        open={open}
        onClose={handleClose}
        title={
          isReassignment ? "Reassign Account Manager" : "Assign Account Manager"
        }
        description={
          isReassignment
            ? "Transfer ownership of this opportunity to a different Account Manager. A reason is required."
            : "Assign an Account Manager to take ownership of this opportunity and begin the review process."
        }
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft={<UserPlus className="h-4 w-4" />}
              onClick={handleConfirm}
              loading={submitting}
            >
              {submitting
                ? "Processing..."
                : isReassignment
                  ? "Review Reassignment"
                  : "Confirm Assignment"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Lead info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Company
              </span>
              <span className="text-sm font-semibold text-foreground truncate">
                {opportunity.company}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Priority
              </span>
              <span className="text-sm font-semibold text-foreground">
                {PRIORITY_SHORT[opportunity.priority]}
              </span>
              <span className="text-2xs text-muted-foreground truncate">
                {PRIORITY_LABELS[opportunity.priority].replace(/^\S+\s—\s/, "")}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Department
              </span>
              <span className="text-sm font-semibold text-foreground truncate">
                {opportunity.department}
              </span>
              <span className="text-2xs text-muted-foreground truncate">
                {getDeptLeaderName(opportunity.department) ?? "—"}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                <Timer className="h-3 w-3" /> Current SLA
              </span>
              <SlaBadge state={slaStatus.currentState} size="sm" />
              <span
                className={cn(
                  "text-2xs font-medium truncate",
                  slaConfig.textClass,
                )}
              >
                {slaStatus.shortLabel}
              </span>
            </div>
          </div>

          {/* Current assignment */}
          {isReassignment && currentAMName && (
            <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
              <div>
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Current Account Manager
                </p>
                <div className="flex items-center gap-2">
                  <Avatar name={currentAMName} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {currentAMName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Currently assigned
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                <div className="flex flex-col gap-1">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Status
                  </span>
                  <StatusBadge
                    status={opportunity.status}
                    size="sm"
                    shortLabel
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Current Deadline
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {slaStatus.activeStageData?.deadline
                      ? formatSlaTimestamp(slaStatus.activeStageData.deadline)
                      : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Time Remaining
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      slaStatus.timeRemaining.isOverdue
                        ? "text-critical dark:text-critical-light"
                        : "text-foreground",
                    )}
                  >
                    {slaStatus.shortLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AM selection with workload */}
          <Select
            label="Available Account Managers"
            value={selectedAM}
            onChange={(v) => {
              setSelectedAM(v);
              setError("");
            }}
            options={amOptions}
            placeholder="Select an Account Manager..."
            error={error && !selectedAM ? error : undefined}
          />

          {/* Workload display for selected AM */}
          {selectedWorkload && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Active Leads
                  </span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {selectedWorkload.activeLeads}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                    selectedWorkload.approachingDeadline > 0
                      ? "bg-warning/10 text-warning"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Clock className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Approaching Deadline
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      selectedWorkload.approachingDeadline > 0
                        ? "text-warning"
                        : "text-foreground",
                    )}
                  >
                    {selectedWorkload.approachingDeadline}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* All AM workload summary */}
          {!selectedAM && availableAMs.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Account Manager Workload
              </p>
              <div className="flex flex-col gap-2">
                {workloads
                  .filter((w) =>
                    availableAMs.some((am) => am.email === w.email),
                  )
                  .map((w) => (
                    <div
                      key={w.email}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={w.name} size="sm" />
                        <span className="text-xs font-medium text-foreground truncate">
                          {w.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-2xs text-muted-foreground">
                          {w.activeLeads} active
                        </span>
                        <span
                          className={cn(
                            "text-2xs font-medium",
                            w.approachingDeadline > 0
                              ? "text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {w.approachingDeadline} near deadline
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Reassignment reason */}
          {isReassignment && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Reason for Reassignment <span className="text-critical">*</span>
              </label>
              <div role="radiogroup" className="flex flex-col gap-2">
                {REASSIGN_REASONS.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors",
                      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
                      reason === r
                        ? "border-foreground/20 bg-secondary/40"
                        : "border-border hover:bg-secondary/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="reassignReason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setCustomReason("");
                        setError("");
                      }}
                      className="h-4 w-4 accent-foreground"
                    />
                    <span className="text-sm text-foreground">{r}</span>
                  </label>
                ))}
              </div>
              {reason === "Other" && (
                <textarea
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setError("");
                  }}
                  placeholder="Specify the reason for reassignment..."
                  aria-label="Custom reason for reassignment"
                  rows={2}
                  className={cn(
                    "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none mt-2",
                    error && !customReason.trim()
                      ? "border-critical/40"
                      : "border-input hover:border-muted-foreground/30",
                  )}
                />
              )}
              {error && !reason && (
                <p className="text-xs text-critical dark:text-critical-light mt-1">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Assignment history */}
          {previousAssignments.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Assignment History
              </p>
              <div className="flex flex-col gap-2">
                {previousAssignments.map((rec) => {
                  const toName =
                    getAccountManagerName(rec.assignedTo) ?? rec.assignedTo;
                  const fromName = rec.previousManager
                    ? (getAccountManagerName(rec.previousManager) ??
                      rec.previousManager)
                    : null;
                  return (
                    <div
                      key={rec.id}
                      className="rounded-lg border border-border p-3 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {fromName ? (
                          <>
                            <Avatar name={fromName} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              {fromName}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                          </>
                        ) : (
                          <Badge variant="outline" size="sm">
                            Unassigned
                          </Badge>
                        )}
                        <Avatar name={toName} size="sm" />
                        <span className="text-xs font-medium text-foreground">
                          {toName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-2xs text-muted-foreground">
                          by {rec.assignedBy} · {rec.timestamp}
                        </span>
                        {rec.reason && rec.reason !== "Initial assignment" && (
                          <span className="text-2xs text-muted-foreground italic">
                            — {rec.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only Account Managers within{" "}
              <span className="font-medium text-foreground">
                {opportunity.department}
              </span>{" "}
              are available for assignment. The Sales Department for this
              department is{" "}
              <span className="font-medium text-foreground">
                {getDeptLeaderName(opportunity.department) ?? "Unassigned"}
              </span>
              .
              {isReassignment &&
                " Reassignment will reset the review SLA timer for the new Account Manager."}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
