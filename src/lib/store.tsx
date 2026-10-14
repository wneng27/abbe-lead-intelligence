import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from './supabase';
import { fetchOpportunities, fetchCompanies, fetchDepartments, fetchUsers, fetchActivityLog, type DbOpportunity, type DbCompany, type DbDepartment, type DbUser, type DbActivityLog } from './db';
import { mapDbPriority, mapDbAssessment, assessmentToLabel, assessmentToTimingLabel, type Opportunity } from './opportunities';
import type { SlaWorkflowData } from './sla';
import { createDeadline } from './sla';
import type { Status, AssessmentLevel } from './tokens';
import { useAuth } from './auth';

export interface ActivityEntry {
  id: string;
  user: string;
  role: string;
  action: string;
  opportunityId: string;
  company: string;
  timestamp: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  department: string | null;
  accountManager: string | null;
}

interface OpportunityUpdate {
  status?: Status;
  accountManager?: string | null;
  department?: string;
  sla?: SlaWorkflowData;
  lastUpdated?: string;
}

interface StoreContextValue {
  getOpportunity: (id: string) => Opportunity | undefined;
  getOpportunities: () => Opportunity[];
  updateOpportunity: (id: string, updates: OpportunityUpdate) => void;
  activityEvents: ActivityEntry[];
  addActivityEvent: (event: ActivityEntry) => void;
  loading: boolean;
  getAccountManagerName: (email: string | null) => string | null;
  getDeptLeaderName: (departmentName: string) => string | null;
  getDepartmentNames: () => string[];
  getAccountManagersInDept: (departmentName: string) => { email: string; name: string }[];
  getAccountManagerOptions: () => { email: string; name: string }[];
}

const StoreContext = createContext<StoreContextValue | null>(null);

function mapDbToOpportunity(
  db: DbOpportunity,
  company: DbCompany | undefined,
  departmentName: string | undefined,
  accountManagerEmail: string | undefined,
  accountManagerName: string | undefined,
): Opportunity {
  const fitLevel = mapDbAssessment(db.fit_score);
  const personLevel: AssessmentLevel = 'unknown';
  const timingLevel: AssessmentLevel = 'unknown';

  const deptAssignedAt = db.department_id ? db.created_at : null;
  const reviewAssignedAt = db.account_manager_id ? db.updated_at ?? db.created_at : null;

  return {
    id: db.id,
    company: company?.company_name ?? 'Unknown',
    title: company?.company_name ?? 'Unknown',
    fit: fitLevel,
    fitLabel: assessmentToLabel(fitLevel, 'fit') as Opportunity['fitLabel'],
    person: personLevel,
    personLabel: assessmentToLabel(personLevel, 'person') as Opportunity['personLabel'],
    timing: timingLevel,
    timingLabel: assessmentToTimingLabel(timingLevel),
    priority: mapDbPriority(db.priority),
    department: departmentName ?? 'Unassigned',
    accountManager: accountManagerEmail ?? null,
    status: db.status as Status,
    lastUpdated: db.updated_at ?? db.created_at,
    discoveredDate: db.created_at,
    contactName: null,
    contactRole: null,
    sla: {
      department: {
        assignedAt: deptAssignedAt,
        deadline: deptAssignedAt ? createDeadline(deptAssignedAt) : null,
        completedAt: reviewAssignedAt ?? null,
      },
      review: {
        assignedAt: reviewAssignedAt,
        deadline: reviewAssignedAt ? createDeadline(reviewAssignedAt) : null,
        completedAt: (db.status === 'reviewed' || db.status === 'ready_for_admin' || db.status === 'nominated') ? (db.updated_at ?? null) : null,
      },
    },
  };
}

function mapActivityLog(
  log: DbActivityLog,
  uMap: Map<string, DbUser>,
  cMap: Map<string, DbCompany>,
  dMap: Map<string, string>,
  oMap: Map<string, Opportunity>,
): ActivityEntry {
  const actor = log.actor_id ? uMap.get(log.actor_id) : undefined;
  const opp = log.opportunity_id ? oMap.get(log.opportunity_id) : undefined;
  const company = opp?.company ?? (log.opportunity_id ? cMap.get(log.opportunity_id)?.company_name ?? '' : '');
  const role: string = actor
    ? actor.role === 'administrator' ? 'Administrator'
      : actor.role === 'sales_leader' ? 'Sales Department'
      : 'Account Manager'
    : 'System';

  return {
    id: log.id,
    user: actor?.name ?? 'System',
    role,
    action: log.action,
    opportunityId: log.opportunity_id ?? '',
    company,
    timestamp: log.timestamp,
    previousStatus: null,
    newStatus: null,
    reason: null,
    department: opp?.department ?? null,
    accountManager: opp?.accountManager ?? null,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [overrides, setOverrides] = useState<Record<string, OpportunityUpdate>>({});
  const [activityEvents, setActivityEvents] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Map<string, DbUser>>(new Map());
  const [companyMap, setCompanyMap] = useState<Map<string, DbCompany>>(new Map());
  const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map());
  const [oppMap, setOppMap] = useState<Map<string, Opportunity>>(new Map());

  useEffect(() => {
    if (!user) {
      setOpportunities([]);
      setActivityEvents([]);
      setOverrides({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadData() {
      try {
        const [dbOpps, companies, departments, users, activity] = await Promise.all([
          fetchOpportunities(),
          fetchCompanies(),
          fetchDepartments(),
          fetchUsers(),
          fetchActivityLog(100),
        ]);

        if (cancelled) return;

        const cMap = new Map<string, DbCompany>();
        for (const c of companies) cMap.set(c.id, c);
        setCompanyMap(cMap);

        const dMap = new Map<string, string>();
        for (const d of departments) dMap.set(d.id, d.name);
        setDeptMap(dMap);

        const uMap = new Map<string, DbUser>();
        for (const u of users) uMap.set(u.id, u);
        setUserMap(uMap);

        const oMap = new Map<string, Opportunity>();
        const mapped = dbOpps.map((o) => {
          const am = o.account_manager_id ? uMap.get(o.account_manager_id) : undefined;
          const opp = mapDbToOpportunity(
            o,
            cMap.get(o.company_id),
            o.department_id ? dMap.get(o.department_id) : undefined,
            am?.email,
            am?.name,
          );
          oMap.set(o.id, opp);
          return opp;
        });
        setOppMap(oMap);
        setOpportunities(mapped);
        setActivityEvents(activity.map((log) => mapActivityLog(log, uMap, cMap, dMap, oMap)));
      } catch {
        if (!cancelled) {
          setOpportunities([]);
          setActivityEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  const getOpportunity = useCallback((id: string) => {
    const base = opportunities.find((o) => o.id === id);
    if (!base) return undefined;
    const override = overrides[id];
    return override ? { ...base, ...override } : base;
  }, [opportunities, overrides]);

  const getOpportunities = useCallback(() => {
    return opportunities.map((o) => {
      const override = overrides[o.id];
      return override ? { ...o, ...override } : o;
    });
  }, [opportunities, overrides]);

  const updateOpportunity = useCallback((id: string, updates: OpportunityUpdate) => {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.lastUpdated) dbUpdates.updated_at = updates.lastUpdated;

    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('opportunities').update(dbUpdates).eq('id', id).then(({ error }) => {
        if (error) console.error('Failed to update opportunity:', error.message);
      });
    }
  }, []);

  const addActivityEvent = useCallback((event: ActivityEntry) => {
    setActivityEvents((prev) => [event, ...prev]);
    const dbUser = userMap.size > 0
      ? Array.from(userMap.values()).find((u) => u.email === user?.email)
      : undefined;
    supabase.from('activity_log').insert({
      actor_id: dbUser?.id ?? null,
      action: event.action,
      opportunity_id: event.opportunityId || null,
      timestamp: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('Failed to insert activity log:', error.message);
    });
  }, [userMap, user]);

  const getAccountManagerName = useCallback((email: string | null): string | null => {
    if (!email) return null;
    const u = Array.from(userMap.values()).find((u) => u.email === email);
    return u?.name ?? null;
  }, [userMap]);

  const getDeptLeaderName = useCallback((departmentName: string): string | null => {
    const deptId = Array.from(deptMap.entries()).find(([, name]) => name === departmentName)?.[0];
    if (!deptId) return null;
    const leader = Array.from(userMap.values()).find((u) => u.role === 'sales_leader' && u.department_id === deptId);
    return leader?.name ?? null;
  }, [userMap, deptMap]);

  const getDepartmentNames = useCallback((): string[] => {
    return Array.from(deptMap.values());
  }, [deptMap]);

  const getAccountManagersInDept = useCallback((departmentName: string): { email: string; name: string }[] => {
    const deptId = Array.from(deptMap.entries()).find(([, name]) => name === departmentName)?.[0];
    if (!deptId) return [];
    return Array.from(userMap.values())
      .filter((u) => u.role === 'account_manager' && u.department_id === deptId)
      .map((u) => ({ email: u.email, name: u.name }));
  }, [userMap, deptMap]);

  const getAccountManagerOptions = useCallback((): { email: string; name: string }[] => {
    return Array.from(userMap.values())
      .filter((u) => u.role === 'account_manager')
      .map((u) => ({ email: u.email, name: u.name }));
  }, [userMap]);

  return (
    <StoreContext.Provider value={{
      getOpportunity,
      getOpportunities,
      updateOpportunity,
      activityEvents,
      addActivityEvent,
      loading,
      getAccountManagerName,
      getDeptLeaderName,
      getDepartmentNames,
      getAccountManagersInDept,
      getAccountManagerOptions,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
