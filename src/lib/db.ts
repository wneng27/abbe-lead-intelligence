import { supabase } from './supabase';
import type {
  DbUser,
  DbDepartment,
  DbCompany,
  DbContact,
  DbOpportunity,
  DbActivityLog,
  DbReview,
  DbEvidence,
  DbSignal,
  DbSource,
  DbOpportunitySource,
  DbExistingAccount,
  DbSystemSetting,
  DbSourceRegistry,
  DbCrmNomination,
  Role,
  Priority,
  OpportunityStatus,
  AssessmentLevel,
} from './database.types';

export type {
  DbUser,
  DbDepartment,
  DbCompany,
  DbContact,
  DbOpportunity,
  DbActivityLog,
  DbReview,
  DbEvidence,
  DbSignal,
  DbSource,
  DbOpportunitySource,
  DbExistingAccount,
  DbSystemSetting,
  DbSourceRegistry,
  DbCrmNomination,
};

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

export type { Role, Priority, OpportunityStatus, AssessmentLevel };

export async function fetchUsers(): Promise<DbUser[]> {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbUser[];
}

export async function fetchUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();
  if (error) throw error;
  return data as DbUser | null;
}

export async function fetchUserByAuthUserId(authUserId: string): Promise<DbUser | null> {
  const { data, error } = await supabase.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw error;
  return data as DbUser | null;
}

export async function fetchUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as DbUser | null;
}

export async function createUser(user: {
  email: string;
  name: string;
  role: Role;
  department_id?: string | null;
  auth_user_id?: string | null;
  active?: boolean;
}): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: user.email.toLowerCase().trim(),
      name: user.name,
      role: user.role,
      department_id: user.department_id ?? null,
      auth_user_id: user.auth_user_id ?? null,
      active: user.active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbUser;
}

export async function updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser> {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as DbUser;
}

export async function fetchDepartments(): Promise<DbDepartment[]> {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) throw error;
  return data as DbDepartment[];
}

export async function createDepartment(name: string): Promise<DbDepartment> {
  const { data, error } = await supabase.from('departments').insert({ name }).select().single();
  if (error) throw error;
  return data as DbDepartment;
}

export async function fetchCompanies(): Promise<DbCompany[]> {
  const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbCompany[];
}

export async function fetchCompanyById(id: string): Promise<DbCompany | null> {
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as DbCompany | null;
}

export async function fetchOpportunities(): Promise<DbOpportunity[]> {
  const { data, error } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbOpportunity[];
}

export async function fetchOpportunityById(id: string): Promise<DbOpportunity | null> {
  const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as DbOpportunity | null;
}

export async function createOpportunity(opp: {
  company_id: string;
  status?: OpportunityStatus;
  priority?: Priority;
  department_id?: string | null;
  sales_leader_id?: string | null;
  account_manager_id?: string | null;
  fit_score?: AssessmentLevel | null;
  fit_score_value?: number | null;
  person_score_value?: number | null;
  timing_score_value?: number | null;
  total_score?: number | null;
  ai_summary?: string | null;
  ai_supporting_findings?: string[] | null;
  ai_conflicts?: string[] | null;
  ai_missing_information?: string[] | null;
  ai_confidence?: 'high' | 'medium' | 'low' | null;
  ai_rationale?: string | null;
  ai_person_assessment?: string | null;
  ai_timing_assessment?: string | null;
}): Promise<DbOpportunity> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      company_id: opp.company_id,
      status: opp.status ?? 'new',
      priority: opp.priority ?? 'medium',
      department_id: opp.department_id ?? null,
      sales_leader_id: opp.sales_leader_id ?? null,
      account_manager_id: opp.account_manager_id ?? null,
      fit_score: opp.fit_score ?? null,
      fit_score_value: opp.fit_score_value ?? null,
      person_score_value: opp.person_score_value ?? null,
      timing_score_value: opp.timing_score_value ?? null,
      total_score: opp.total_score ?? null,
      ai_summary: opp.ai_summary ?? null,
      ai_supporting_findings: opp.ai_supporting_findings ?? null,
      ai_conflicts: opp.ai_conflicts ?? null,
      ai_missing_information: opp.ai_missing_information ?? null,
      ai_confidence: opp.ai_confidence ?? null,
      ai_rationale: opp.ai_rationale ?? null,
      ai_person_assessment: opp.ai_person_assessment ?? null,
      ai_timing_assessment: opp.ai_timing_assessment ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbOpportunity;
}

export async function updateOpportunity(id: string, updates: Partial<DbOpportunity>): Promise<DbOpportunity> {
  const { data, error } = await supabase.from('opportunities').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as DbOpportunity;
}

export async function fetchActivityLog(limit: number = 100): Promise<DbActivityLog[]> {
  const { data, error } = await supabase.from('activity_log').select('*').order('timestamp', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as DbActivityLog[];
}

export async function insertActivityLog(entry: {
  actor_id?: string | null;
  action: string;
  opportunity_id?: string | null;
}): Promise<DbActivityLog> {
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      actor_id: entry.actor_id ?? null,
      action: entry.action,
      opportunity_id: entry.opportunity_id ?? null,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbActivityLog;
}

export async function fetchReviews(opportunityId: string): Promise<DbReview[]> {
  const { data, error } = await supabase.from('reviews').select('*').eq('opportunity_id', opportunityId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbReview[];
}

export async function createReview(review: {
  opportunity_id: string;
  reviewer_id?: string | null;
  review_status?: string;
  disposition?: string | null;
  comments?: string | null;
  reviewed_at?: string | null;
}): Promise<DbReview> {
  const insertPayload: Record<string, unknown> = {
    opportunity_id: review.opportunity_id,
    reviewer_id: review.reviewer_id ?? null,
    review_status: review.review_status ?? 'pending',
  };
  if (review.disposition !== undefined) insertPayload.disposition = review.disposition;
  if (review.comments !== undefined) insertPayload.comments = review.comments;
  if (review.reviewed_at !== undefined) insertPayload.reviewed_at = review.reviewed_at;
  const { data, error } = await supabase
    .from('reviews')
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  return data as DbReview;
}

export async function updateReview(id: string, updates: Partial<DbReview>): Promise<DbReview> {
  const { data, error } = await supabase.from('reviews').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as DbReview;
}

export async function fetchEvidence(opportunityId: string): Promise<DbEvidence[]> {
  const { data, error } = await supabase.from('evidence').select('*').eq('opportunity_id', opportunityId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbEvidence[];
}

export async function fetchSignals(companyId: string): Promise<DbSignal[]> {
  const { data, error } = await supabase.from('signals').select('*').eq('company_id', companyId).order('signal_date', { ascending: false });
  if (error) throw error;
  return data as DbSignal[];
}

export async function fetchSources(): Promise<DbSource[]> {
  const { data, error } = await supabase.from('sources').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbSource[];
}

export async function fetchOpportunitySources(opportunityId: string): Promise<DbOpportunitySource[]> {
  const { data, error } = await supabase.from('opportunity_sources').select('*').eq('opportunity_id', opportunityId);
  if (error) throw error;
  return data as DbOpportunitySource[];
}

export async function fetchContacts(companyId: string): Promise<DbContact[]> {
  const { data, error } = await supabase.from('contacts').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbContact[];
}

export async function fetchAllContacts(): Promise<DbContact[]> {
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbContact[];
}

export async function fetchAllSignals(): Promise<DbSignal[]> {
  const { data, error } = await supabase.from('signals').select('*').order('signal_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as DbSignal[];
}

export async function fetchExistingAccounts(): Promise<DbExistingAccount[]> {
  const { data, error } = await supabase.from('existing_accounts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbExistingAccount[];
}

export async function fetchSystemSettings(): Promise<DbSystemSetting[]> {
  const { data, error } = await supabase.from('system_settings').select('*').order('setting_key');
  if (error) throw error;
  return data as DbSystemSetting[];
}

export async function upsertSystemSetting(key: string, value: string, description?: string): Promise<DbSystemSetting> {
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({ setting_key: key, setting_value: value, description, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })
    .select()
    .single();
  if (error) throw error;
  return data as DbSystemSetting;
}

export async function fetchSourceRegistry(): Promise<DbSourceRegistry[]> {
  const { data, error } = await supabase.from('source_registry').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbSourceRegistry[];
}

export async function createSourceRegistry(entry: {
  source_name: string;
  source_type: string;
  description?: string;
}): Promise<DbSourceRegistry> {
  const { data, error } = await supabase
    .from('source_registry')
    .insert({ source_name: entry.source_name, source_type: entry.source_type, description: entry.description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as DbSourceRegistry;
}

export async function fetchAccessDurationHours(): Promise<number> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'sales_leader_access_duration_hours')
    .maybeSingle();
  if (error || !data) return 24;
  const parsed = parseInt(data.setting_value, 10);
  return isNaN(parsed) || parsed <= 0 ? 24 : parsed;
}

export async function grantUserAccess(email: string, _grantedBy: string): Promise<DbUser> {
  const { data, error } = await supabase.rpc('grant_sales_leader_access', {
    target_email: email,
  });
  if (error) throw error;
  return data as DbUser;
}

export async function revokeUserAccess(email: string): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .update({ access_granted_at: null, access_expires_at: null })
    .eq('email', email.toLowerCase().trim())
    .select()
    .single();
  if (error) throw error;
  return data as DbUser;
}

export async function fetchCrmNominations(): Promise<DbCrmNomination[]> {
  const { data, error } = await supabase.from('crm_nominations').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbCrmNomination[];
}

export async function fetchCrmNominationsByOpportunity(opportunityId: string): Promise<DbCrmNomination[]> {
  const { data, error } = await supabase.from('crm_nominations').select('*').eq('opportunity_id', opportunityId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbCrmNomination[];
}

export async function createCrmNomination(nomination: {
  opportunity_id: string;
  nominated_by?: string | null;
  status?: string;
  comments?: string | null;
}): Promise<DbCrmNomination> {
  const { data, error } = await supabase
    .from('crm_nominations')
    .insert({
      opportunity_id: nomination.opportunity_id,
      nominated_by: nomination.nominated_by ?? null,
      status: nomination.status ?? 'nominated',
      comments: nomination.comments ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbCrmNomination;
}
