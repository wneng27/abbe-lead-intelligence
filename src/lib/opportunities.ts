import type { Status } from '@/lib/tokens';
import type { AssessmentLevel } from '@/lib/tokens';
import type { SlaWorkflowData } from '@/lib/sla';
import {
  fetchOpportunityById,
  fetchCompanyById,
  fetchContacts,
  fetchSignals,
  fetchEvidence,
  fetchOpportunitySources,
  fetchReviews,
  fetchActivityLog,
  fetchSources,
  type DbSource,
} from './db';

export type Priority = 'P1' | 'P2' | 'P3';

export type FitLevel = AssessmentLevel;
export type PersonLevel = AssessmentLevel;
export type TimingLevel = AssessmentLevel;

export type TimingLabel = 'Recent Trigger' | 'Upcoming Event' | 'Ongoing' | 'Stale' | 'Unknown';

export type PersonLabel = 'Verified' | 'Identified' | 'Partial' | 'Unknown';

export type FitLabel = 'Strong' | 'Moderate' | 'Weak' | 'Unknown';

export interface Opportunity {
  id: string;
  company: string;
  title: string;
  fit: FitLevel;
  fitLabel: FitLabel;
  fitScore: number | null;
  person: PersonLevel;
  personLabel: PersonLabel;
  timing: TimingLevel;
  timingLabel: TimingLabel;
  priority: Priority;
  department: string;
  accountManager: string | null;
  status: Status;
  lastUpdated: string;
  discoveredDate: string;
  contactName: string | null;
  contactRole: string | null;
  sla: SlaWorkflowData;
  totalScore: number | null;
  aiConfidence: 'high' | 'medium' | 'low' | null;
}

import { supabase } from './supabase';

export async function loadDepartmentNames(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('departments').select('name').order('name');
    if (!error && data) {
      return data.map((d) => d.name);
    }
  } catch {
    // Return empty array on error
  }
  return [];
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'P1 — High Priority',
  P2: 'P2 — Medium Priority',
  P3: 'P3 — Lower Priority',
};

export const PRIORITY_SHORT: Record<Priority, string> = {
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

export function mapDbPriority(dbPriority: string): Priority {
  switch (dbPriority) {
    case 'critical': return 'P1';
    case 'high': return 'P1';
    case 'medium': return 'P2';
    case 'low': return 'P3';
    default: return 'P3';
  }
}

export function mapDbAssessment(level: string | null): AssessmentLevel {
  if (!level) return 'unknown';
  if (level === 'strong' || level === 'moderate' || level === 'weak' || level === 'unknown') return level;
  return 'unknown';
}

export function assessmentToLabel(level: AssessmentLevel, kind: 'fit' | 'person' | 'timing'): string {
  const labels: Record<AssessmentLevel, string> = {
    strong: 'Strong',
    moderate: 'Moderate',
    weak: 'Weak',
    unknown: 'Unknown',
  };
  if (kind === 'person') {
    if (level === 'strong') return 'Verified';
    if (level === 'moderate') return 'Identified';
    if (level === 'weak') return 'Partial';
    return 'Unknown';
  }
  return labels[level];
}

export function assessmentToTimingLabel(level: AssessmentLevel): TimingLabel {
  switch (level) {
    case 'strong': return 'Recent Trigger';
    case 'moderate': return 'Upcoming Event';
    case 'weak': return 'Ongoing';
    default: return 'Unknown';
  }
}

/* ─── Detail-level data ─── */

export type EvidenceStatus = 'verified' | 'needs_verification' | 'unverified';

export type EvidenceCategory = 'fit' | 'person' | 'timing' | 'general';

export interface EvidenceItem {
  id: string;
  statement: string;
  source: string;
  sourceType?: string;
  sourceDate: string;
  retrievalDate?: string;
  status: EvidenceStatus;
  link?: string;
  category?: EvidenceCategory;
  excerpt?: string;
  confidence?: 'high' | 'medium' | 'low';
  conflictNote?: string;
}

export interface BusinessSignal {
  id: string;
  type: string;
  description: string;
  date: string;
  isMock: boolean;
}

export interface TimelineEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  role?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  department?: string | null;
  accountManager?: string | null;
}

export interface ResearchSummarySection {
  heading: string;
  body: string;
  isAiInterpretation?: boolean;
}

export interface FitDetail {
  assessment: string;
  score: number;
  maxScore: number;
  rationale: string;
  abbeCapability: string;
  evidenceIds: string[];
}

export interface PersonDetail {
  contactName: string | null;
  contactRole: string | null;
  company: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  sourceReference?: string | null;
  verificationStatus: 'Verified' | 'Needs Verification' | 'Unverified';
  lastVerifiedDate: string | null;
  score: number;
  maxScore: number;
  evidenceIds: string[];
}

export interface TimingDetail {
  trigger: string;
  triggerDate: string;
  assessment: string;
  score: number;
  maxScore: number;
  whyRelevantNow: string;
  evidenceIds: string[];
}

export interface RecommendedAction {
  why: string;
  evidence: string;
  suggestedAction: string;
}

export interface AiFindings {
  summary: string;
  supportingFindings: string[];
  conflicts: string[];
  missingInformation: string[];
  confidence: 'high' | 'medium' | 'low';
}

export type GatekeeperState = 'passed' | 'verification_required' | 'failed';

export interface OpportunityDetail {
  overview: {
    industry: string;
    location: string;
    companyDescription: string;
    source: string;
    dateSurfaced: string;
    lastUpdated: string;
  };
  fit: FitDetail;
  person: PersonDetail;
  timing: TimingDetail;
  evidence: EvidenceItem[];
  researchSummary: ResearchSummarySection[];
  businessSignals: BusinessSignal[];
  gatekeeper: {
    state: GatekeeperState;
    description: string;
    verifiedDate: string | null;
  };
  aiFindings: AiFindings;
  recommendedAction: RecommendedAction;
  timeline: TimelineEvent[];
}

export async function fetchOpportunityDetailFromDb(opportunityId: string): Promise<OpportunityDetail | null> {
  const opp = await fetchOpportunityById(opportunityId);
  if (!opp) return null;

  const company = await fetchCompanyById(opp.company_id);
  const [contacts, signals, evidence, opportunitySources, reviews, activityLog] = await Promise.all([
    fetchContacts(opp.company_id),
    fetchSignals(opp.company_id),
    fetchEvidence(opportunityId),
    fetchOpportunitySources(opportunityId),
    fetchReviews(opportunityId),
    fetchActivityLog(50),
  ]);

  const sourceIds = opportunitySources.map((os) => os.source_id);
  const allSources = sourceIds.length > 0 ? await fetchSources() : [];
  const sourceMap = new Map<string, DbSource>();
  for (const s of allSources) sourceMap.set(s.id, s);

  const oppActivity = activityLog.filter((a) => a.opportunity_id === opportunityId);

  const timeline: TimelineEvent[] = oppActivity.map((a) => ({
    id: a.id,
    actor: a.actor_id ?? 'System',
    action: a.action,
    timestamp: a.timestamp,
    role: undefined,
    previousStatus: null,
    newStatus: null,
    reason: null,
    department: null,
    accountManager: null,
  }));

  const businessSignals: BusinessSignal[] = signals.map((s) => ({
    id: s.id,
    type: s.signal_type ?? 'Signal',
    description: s.signal_description ?? '',
    date: s.signal_date ?? s.created_at,
    isMock: false,
  }));

  const evidenceItems: EvidenceItem[] = evidence.map((e) => {
    const src = e.source_id ? sourceMap.get(e.source_id) : undefined;
    return {
      id: e.id,
      statement: e.excerpt ?? '',
      source: src?.source_name ?? 'Unknown source',
      sourceType: src?.source_type,
      sourceDate: e.created_at,
      retrievalDate: e.created_at,
      status: 'unverified' as EvidenceStatus,
      link: e.source_url ?? undefined,
      category: 'general' as EvidenceCategory,
      excerpt: e.excerpt ?? undefined,
      confidence: e.confidence ?? undefined,
    };
  });

  const fitLevel = mapDbAssessment(opp.fit_score);
  const contact = contacts[0] ?? null;

  const personLevel = (contact ? 'moderate' : 'unknown') as AssessmentLevel;
  const timingLevel = (signals.length > 0 ? 'moderate' : 'unknown') as AssessmentLevel;

  const fitScore = opp.fit_score_value ?? (fitLevel === 'strong' ? 35 : fitLevel === 'moderate' ? 25 : fitLevel === 'weak' ? 10 : 0);
  const personScore = opp.person_score_value ?? (personLevel === 'strong' ? 25 : personLevel === 'moderate' ? 18 : personLevel === 'weak' ? 8 : 0);
  const timingScore = opp.timing_score_value ?? (timingLevel === 'strong' ? 25 : timingLevel === 'moderate' ? 18 : timingLevel === 'weak' ? 8 : 0);

  const aiSupporting = opp.ai_supporting_findings ?? [];
  const aiConflicts = opp.ai_conflicts ?? [];
  const aiMissing = opp.ai_missing_information ?? [];
  const aiConfidence = opp.ai_confidence ?? 'low';

  const fitRationale = opp.ai_rationale
    ?? (evidenceItems.filter((e) => e.category === 'fit').map((e) => e.statement).join(' ') || 'No fit rationale available.');
  const personAssessment = opp.ai_person_assessment
    ?? (contact ? `Contact identified: ${contact.name} at ${company?.company_name ?? 'the company'}.` : 'No contact has been identified yet.');
  const timingAssessment = opp.ai_timing_assessment
    ?? (businessSignals.length > 0 ? businessSignals[0].description : 'No timing information available.');

  return {
    overview: {
      industry: company?.industry ?? '—',
      location: company?.location ?? '—',
      companyDescription: company?.company_name ?? '',
      source: businessSignals.length > 0 ? businessSignals[0].type : 'Research',
      dateSurfaced: opp.created_at,
      lastUpdated: opp.updated_at ?? opp.created_at,
    },
    fit: {
      assessment: fitLevel,
      score: fitScore,
      maxScore: 40,
      rationale: fitRationale,
      abbeCapability: 'ABBE capability assessment not yet available.',
      evidenceIds: evidenceItems.filter((e) => e.category === 'fit').map((e) => e.id),
    },
    person: {
      contactName: contact?.name ?? null,
      contactRole: null,
      company: company?.company_name ?? '',
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      linkedinUrl: contact?.linkedin_url ?? null,
      sourceReference: null,
      verificationStatus: contact ? 'Needs Verification' : 'Unverified',
      lastVerifiedDate: null,
      score: personScore,
      maxScore: 30,
      evidenceIds: [],
    },
    timing: {
      trigger: businessSignals.length > 0 ? businessSignals[0].type : 'No trigger identified',
      triggerDate: businessSignals.length > 0 ? businessSignals[0].date : opp.created_at,
      assessment: timingLevel,
      score: timingScore,
      maxScore: 30,
      whyRelevantNow: timingAssessment,
      evidenceIds: evidenceItems.filter((e) => e.category === 'timing').map((e) => e.id),
    },
    evidence: evidenceItems,
    researchSummary: [],
    businessSignals,
    gatekeeper: {
      state: fitLevel === 'strong' || fitLevel === 'moderate' ? 'passed' : 'verification_required',
      description: 'Automated quality gate based on available evidence and signals.',
      verifiedDate: null,
    },
    aiFindings: {
      summary: opp.ai_summary ?? 'AI analysis not yet available for this opportunity.',
      supportingFindings: aiSupporting,
      conflicts: aiConflicts,
      missingInformation: aiMissing,
      confidence: aiConfidence as 'high' | 'medium' | 'low',
    },
    recommendedAction: {
      why: 'Recommendation pending review of available evidence.',
      evidence: 'See evidence section.',
      suggestedAction: 'Review and assess.',
    },
    timeline,
  };
}
