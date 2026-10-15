export type Role = 'administrator' | 'sales_leader' | 'account_manager';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type OpportunityStatus =
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

export type AssessmentLevel = 'strong' | 'moderate' | 'weak' | 'unknown';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ReviewStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned';

export type SignalType = string;

export type SourceType = string;

export interface DbUser {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string;
  role: Role;
  department_id: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string | null;
  access_granted_at: string | null;
  access_expires_at: string | null;
}

export interface DbDepartment {
  id: string;
  name: string;
  created_at: string;
}

export interface DbCompany {
  id: string;
  company_name: string;
  industry: string | null;
  location: string | null;
  created_at: string;
  updated_at: string | null;
  domain: string | null;
}

export interface DbContact {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DbSource {
  id: string;
  source_name: string;
  source_type: string;
  source_url: string | null;
  created_at: string;
}

export interface DbEvidence {
  id: string;
  opportunity_id: string;
  source_url: string | null;
  source_id: string | null;
  created_at: string;
  excerpt: string | null;
  confidence: ConfidenceLevel | null;
}

export interface DbSignal {
  id: string;
  company_id: string;
  signal_type: string;
  confidence: ConfidenceLevel | null;
  created_at: string;
  signal_description: string | null;
  signal_date: string | null;
}

export interface DbOpportunity {
  id: string;
  company_id: string;
  status: OpportunityStatus;
  priority: Priority;
  department_id: string | null;
  sales_leader_id: string | null;
  account_manager_id: string | null;
  created_at: string;
  updated_at: string | null;
  fit_score: AssessmentLevel | number | null;
  fit_score_value: number | null;
  person_score_value: number | null;
  timing_score_value: number | null;
  total_score: number | null;
  ai_summary: string | null;
  ai_supporting_findings: string[] | null;
  ai_conflicts: string[] | null;
  ai_missing_information: string[] | null;
  ai_confidence: 'high' | 'medium' | 'low' | null;
  ai_rationale: string | null;
  ai_person_assessment: string | null;
  ai_timing_assessment: string | null;
}

export interface DbOpportunitySource {
  opportunity_id: string;
  source_id: string;
}

export interface DbReview {
  id: string;
  opportunity_id: string;
  reviewer_id: string | null;
  review_status: ReviewStatus;
  disposition: string | null;
  comments: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DbActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  timestamp: string;
  opportunity_id: string | null;
}

export interface DbCrmNomination {
  id: string;
  opportunity_id: string;
  nominated_by: string | null;
  status: string;
  comments: string | null;
  created_at: string;
}

export interface DbExistingAccount {
  id: string;
  company_name: string;
  created_at: string;
}

export interface DbSystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  created_at: string;
  updated_at: string | null;
  description: string | null;
}

export interface DbSourceRegistry {
  id: string;
  source_name: string;
  source_type: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export const TABLE_NAMES = {
  users: 'users',
  departments: 'departments',
  companies: 'companies',
  contacts: 'contacts',
  sources: 'sources',
  evidence: 'evidence',
  signals: 'signals',
  opportunities: 'opportunities',
  opportunity_sources: 'opportunity_sources',
  reviews: 'reviews',
  activity_log: 'activity_log',
  crm_nominations: 'crm_nominations',
  existing_accounts: 'existing_accounts',
  system_settings: 'system_settings',
  source_registry: 'source_registry',
} as const;
