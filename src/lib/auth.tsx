import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import {
  fetchUserByAuthUserId,
  fetchUsers,
  grantUserAccess,
  revokeUserAccess,
  fetchAccessDurationHours,
  insertActivityLog,
  type DbUser,
} from './db';
import {
  ROLE_CONFIG,
  NOT_GRANTED_ACCESS,
  computeAccessState,
  isValidRole,
  type Role,
  type DemoUser,
  type AccessRecord,
} from './navigation';

export type { DemoUser } from './navigation';
export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthUser extends DemoUser {
  department?: string;
  departmentId?: string | null;
  active?: boolean;
  access?: AccessRecord;
}

export interface RegisteredUser extends DemoUser {
  department: string;
  departmentId: string | null;
  active: boolean;
  createdAt: string | null;
}

const REMEMBERED_KEY = 'abbe_remembered_accounts';

export interface RememberedAccount {
  email: string;
  name: string;
  role: Role;
}

export interface SalesLeaderInfo {
  user: DemoUser;
  department: string;
  access: AccessRecord;
}

export interface AccessHistoryEntry {
  id: string;
  salesLeader: string;
  action: 'granted' | 'revoked';
  grantedBy: string;
  grantedAt: number;
  expiresAt: number;
  revokedAt: number | null;
  status: 'active' | 'expired' | 'revoked';
}

interface AuthContextValue {
  state: AuthState;
  user: AuthUser | null;
  salesLeaderAccess: AccessRecord;
  salesLeaders: SalesLeaderInfo[];
  accessHistory: AccessHistoryEntry[];
  rememberedAccounts: RememberedAccount[];
  registeredUsers: RegisteredUser[];
  deactivateAccount: (email: string) => Promise<{ success: boolean; error?: string }>;
  reactivateAccount: (email: string) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, role: Role, name: string, department?: string) => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: Role) => void;
  signOut: () => void;
  retry: () => void;
  grantAccess: (salesLeaderEmail: string) => void;
  revokeAccess: (salesLeaderEmail: string) => void;
  removeRememberedAccount: (email: string) => void;
  clearRememberedAccounts: () => void;
  setError: (message: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadRemembered(): RememberedAccount[] {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RememberedAccount[];
  } catch {
    return [];
  }
}

function saveRemembered(accounts: RememberedAccount[]) {
  localStorage.setItem(REMEMBERED_KEY, JSON.stringify(accounts));
}

function addRemembered(email: string, name: string, role: Role) {
  const existing = loadRemembered();
  const filtered = existing.filter((a) => a.email.toLowerCase() !== email.toLowerCase());
  const entry: RememberedAccount = { email, name, role };
  saveRemembered([entry, ...filtered].slice(0, 5));
}

function dbUserToAuthUser(dbUser: DbUser, departmentName?: string): AuthUser {
  return {
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: departmentName ?? (dbUser.role === 'administrator' ? 'None' : 'Unassigned'),
    departmentId: dbUser.department_id,
    active: dbUser.active ?? true,
    access: buildAccessFromDb(dbUser),
  };
}

function dbUserToRegistered(dbUser: DbUser, departmentName?: string): RegisteredUser {
  return {
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: departmentName ?? (dbUser.role === 'administrator' ? 'None' : 'Unassigned'),
    departmentId: dbUser.department_id,
    active: dbUser.active ?? true,
    createdAt: dbUser.created_at ?? null,
  };
}

function buildAccessFromDb(dbUser: DbUser): AccessRecord {
  if (!dbUser.access_granted_at || !dbUser.access_expires_at) {
    return NOT_GRANTED_ACCESS;
  }
  const grantedAt = new Date(dbUser.access_granted_at).getTime();
  const expiresAt = new Date(dbUser.access_expires_at).getTime();
  const state = computeAccessState(expiresAt, Date.now());
  return {
    access_granted_at: grantedAt,
    access_expires_at: expiresAt,
    access_granted_by: 'Administrator',
    access_status: state,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [salesLeaders, setSalesLeaders] = useState<SalesLeaderInfo[]>([]);
  const [accessHistory, setAccessHistory] = useState<AccessHistoryEntry[]>([]);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(loadRemembered);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [departmentMap, setDepartmentMap] = useState<Record<string, string>>({});
  const [accessDurationHours, setAccessDurationHours] = useState<number>(24);
  const departmentMapRef = useRef<Record<string, string>>({});
  departmentMapRef.current = departmentMap;
  const isSigningInRef = useRef(false);

  const salesLeaderAccess =
    user?.access ??
    salesLeaders.find((sl) => sl.user.email.toLowerCase() === (user?.email ?? '').toLowerCase())?.access ??
    NOT_GRANTED_ACCESS;

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      if (!user) return;

      const { data: deptData, error: deptError } = await supabase.from('departments').select('id, name');
      if (cancelled) return;
      if (deptError || !deptData) {
        setDepartmentMap({});
        setRegisteredUsers([]);
        return;
      }

      const map: Record<string, string> = {};
      for (const d of deptData) map[d.id] = d.name;
      setDepartmentMap(map);

      try {
        const duration = await fetchAccessDurationHours();
        if (!cancelled) setAccessDurationHours(duration);
      } catch {
        // keep default 24
      }

      try {
        const users = await fetchUsers();
        if (cancelled) return;
        const mapped = users.map((u) => dbUserToRegistered(u, u.department_id ? map[u.department_id] : undefined));
        setRegisteredUsers(mapped);
      } catch {
        if (!cancelled) setRegisteredUsers([]);
      }
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (Object.keys(departmentMap).length === 0) return;
    fetchUsers().then((users) => {
      const mapped = users.map((u) => dbUserToRegistered(u, u.department_id ? departmentMap[u.department_id] : undefined));
      setRegisteredUsers(mapped);
    }).catch(() => {});

    if (user && user.departmentId) {
      const deptName = departmentMap[user.departmentId];
      if (deptName && deptName !== user.department) {
        setUser((prev) => prev ? { ...prev, department: deptName } : prev);
      }
    }
  }, [departmentMap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setState('unauthenticated');
        return;
      }
      try {
        const dbUser = await fetchUserByAuthUserId(data.session.user.id);
        if (cancelled) return;
        if (!dbUser) {
          setState('unauthenticated');
          return;
        }
        if (dbUser.active === false) {
          setState('error');
          setErrorState('This account has been deactivated and can no longer access the system.');
          await supabase.auth.signOut();
          return;
        }
        if (!isValidRole(dbUser.role)) {
          setState('error');
          setErrorState('Your account role could not be determined. Please contact an administrator.');
          await supabase.auth.signOut();
          return;
        }
        const deptName = dbUser.department_id ? departmentMapRef.current[dbUser.department_id] : undefined;
        const authUser = dbUserToAuthUser(dbUser, deptName);
        setUser(authUser);
        setState('authenticated');
        addRemembered(dbUser.email, dbUser.name, dbUser.role);
        setRememberedAccounts(loadRemembered());
      } catch {
        if (!cancelled) {
          setState('error');
          setErrorState('Failed to load user profile.');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setState('unauthenticated');
        setUser(null);
        setErrorState(null);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (event === 'SIGNED_IN' && isSigningInRef.current) {
          return;
        }
        if (session.user) {
          (async () => {
            try {
              const dbUser = await fetchUserByAuthUserId(session.user.id);
              if (dbUser) {
                if (dbUser.active === false) {
                  setState('error');
                  setErrorState('This account has been deactivated and can no longer access the system.');
                  await supabase.auth.signOut();
                  return;
                }
                if (!isValidRole(dbUser.role)) {
                  setState('error');
                  setErrorState('Your account role could not be determined. Please contact an administrator.');
                  await supabase.auth.signOut();
                  return;
                }
                const deptName = dbUser.department_id ? departmentMapRef.current[dbUser.department_id] : undefined;
                const authUser = dbUserToAuthUser(dbUser, deptName);
                setUser(authUser);
                setState('authenticated');
                addRemembered(dbUser.email, dbUser.name, dbUser.role);
                setRememberedAccounts(loadRemembered());
              } else {
                setState('unauthenticated');
                setUser(null);
              }
            } catch {
              setState('error');
              setErrorState('Failed to load user profile.');
            }
          })();
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || Object.keys(departmentMap).length === 0) return;
    let cancelled = false;

    async function loadSalesLeaders() {
      try {
        const users = await fetchUsers();
        if (cancelled) return;
        const leaders = users
          .filter((u) => u.role === 'sales_leader')
          .map((u) => {
            const deptName = u.department_id ? departmentMap[u.department_id] : 'Unassigned';
            return {
              user: { name: u.name, email: u.email, role: u.role as Role },
              department: deptName,
              access: buildAccessFromDb(u),
            };
          });
        setSalesLeaders(leaders);
      } catch {
        if (!cancelled) setSalesLeaders([]);
      }
    }

    loadSalesLeaders();
    return () => { cancelled = true; };
  }, [user, departmentMap, registeredUsers]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setState('loading');
    setErrorState(null);
    isSigningInRef.current = true;

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        isSigningInRef.current = false;
        setState('unauthenticated');
        return { success: false, error: signInError.message };
      }

      if (!data.user) {
        isSigningInRef.current = false;
        setState('unauthenticated');
        return { success: false, error: 'Authentication failed.' };
      }

      const dbUser = await fetchUserByAuthUserId(data.user.id);
      if (!dbUser) {
        isSigningInRef.current = false;
        setState('unauthenticated');
        return { success: false, error: 'User profile not found. Please contact an administrator.' };
      }

      if (dbUser.active === false) {
        isSigningInRef.current = false;
        setState('error');
        setErrorState('This account has been deactivated and can no longer access the system.');
        await supabase.auth.signOut();
        return { success: false, error: 'This account has been deactivated and can no longer access the system.' };
      }

      if (!isValidRole(dbUser.role)) {
        isSigningInRef.current = false;
        setState('error');
        setErrorState('Your account role could not be determined. Please contact an administrator.');
        await supabase.auth.signOut();
        return { success: false, error: 'Your account role could not be determined. Please contact an administrator.' };
      }

      const deptName = dbUser.department_id ? departmentMap[dbUser.department_id] : undefined;
      const authUser = dbUserToAuthUser(dbUser, deptName);
      setUser(authUser);
      setState('authenticated');
      isSigningInRef.current = false;
      addRemembered(dbUser.email, dbUser.name, dbUser.role);
      setRememberedAccounts(loadRemembered());
      return { success: true };
    } catch (err) {
      isSigningInRef.current = false;
      setState('unauthenticated');
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      return { success: false, error: msg };
    }
  }, [departmentMap]);

  const signUp = useCallback(async (email: string, password: string, role: Role, fullName: string, department?: string): Promise<{ success: boolean; error?: string }> => {
    setState('loading');
    setErrorState(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signUpError) {
        setState('unauthenticated');
        return { success: false, error: signUpError.message };
      }

      if (!data.user) {
        setState('unauthenticated');
        return { success: false, error: 'Sign up failed. Please try again.' };
      }

      let departmentId: string | null = null;
      if (department) {
        const { data: dept } = await supabase.from('departments').select('id').eq('name', department).maybeSingle();
        if (dept) departmentId = dept.id;
      }

      const { error: insertError } = await supabase.from('users').insert({
        email: email.toLowerCase().trim(),
        name: fullName || 'New User',
        role,
        department_id: departmentId,
        auth_user_id: data.user.id,
        active: true,
      });

      if (insertError) {
        setState('unauthenticated');
        return { success: false, error: `Failed to create user profile: ${insertError.message}` };
      }

      const dbUser = await fetchUserByAuthUserId(data.user.id);
      if (dbUser) {
        const deptName = dbUser.department_id ? departmentMap[dbUser.department_id] : department;
        const authUser = dbUserToAuthUser(dbUser, deptName);
        setUser(authUser);
        setState('authenticated');
        addRemembered(dbUser.email, dbUser.name, dbUser.role);
        setRememberedAccounts(loadRemembered());
      } else {
        setState('unauthenticated');
        return { success: false, error: 'User profile could not be loaded after creation. Please contact an administrator.' };
      }

      return { success: true };
    } catch (err) {
      setState('unauthenticated');
      const msg = err instanceof Error ? err.message : 'Sign up failed.';
      return { success: false, error: msg };
    }
  }, [departmentMap]);

  const switchRole = useCallback((role: Role) => {
    setState('loading');
    setErrorState(null);
    setUser((prev) => prev ? { ...prev, role } : {
      name: '',
      email: '',
      role,
      department: role === 'administrator' ? 'None' : 'Unassigned',
    });
    setState('authenticated');
  }, []);

  const signOut = useCallback(() => {
    supabase.auth.signOut();
    setState('unauthenticated');
    setUser(null);
    setErrorState(null);
  }, []);

  const retry = useCallback(() => {
    setState('loading');
    setErrorState(null);
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setState('unauthenticated');
        return;
      }
      try {
        const dbUser = await fetchUserByAuthUserId(data.session.user.id);
        if (!dbUser) {
          setState('unauthenticated');
          return;
        }
        if (dbUser.active === false) {
          setState('error');
          setErrorState('This account has been deactivated and can no longer access the system.');
          await supabase.auth.signOut();
          return;
        }
        if (!isValidRole(dbUser.role)) {
          setState('error');
          setErrorState('Your account role could not be determined. Please contact an administrator.');
          await supabase.auth.signOut();
          return;
        }
        const deptName = dbUser.department_id ? departmentMap[dbUser.department_id] : undefined;
        const authUser = dbUserToAuthUser(dbUser, deptName);
        setUser(authUser);
        setState('authenticated');
      } catch {
        setState('error');
        setErrorState('Failed to load user profile.');
      }
    });
  }, [departmentMap]);

  const grantAccess = useCallback(async (salesLeaderEmail: string) => {
    const slInfo = salesLeaders.find((sl) => sl.user.email === salesLeaderEmail);
    const slName = slInfo?.user.name ?? salesLeaderEmail;

    let grantedAt: number;
    let expiresAt: number;

    try {
      const updatedUser = await grantUserAccess(salesLeaderEmail, 'Administrator');
      grantedAt = new Date(updatedUser.access_granted_at!).getTime();
      expiresAt = new Date(updatedUser.access_expires_at!).getTime();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to grant access.';
      setSalesLeaders((prev) =>
        prev.map((sl) =>
          sl.user.email === salesLeaderEmail
            ? {
                ...sl,
                access: {
                  ...sl.access,
                  access_status: 'expired' as const,
                },
              }
            : sl
        )
      );
      throw new Error(msg);
    }

    setSalesLeaders((prev) =>
      prev.map((sl) =>
        sl.user.email === salesLeaderEmail
          ? {
              ...sl,
              access: {
                access_granted_at: grantedAt,
                access_expires_at: expiresAt,
                access_granted_by: 'Administrator',
                access_status: 'active' as const,
              },
            }
          : sl
      )
    );
    setAccessHistory((prev) => [
      {
        id: `${grantedAt}-${salesLeaderEmail}`,
        salesLeader: slName,
        action: 'granted',
        grantedBy: 'Administrator',
        grantedAt,
        expiresAt,
        revokedAt: null,
        status: 'active',
      },
      ...prev,
    ]);

    try {
      await insertActivityLog({
        actor_id: null,
        action: `access_granted: ${salesLeaderEmail}`,
      });
    } catch {
      // activity log write failure should not block the grant
    }
  }, [salesLeaders]);

  const revokeAccess = useCallback(async (salesLeaderEmail: string) => {
    const now = Date.now();
    const slInfo = salesLeaders.find((sl) => sl.user.email === salesLeaderEmail);
    const slName = slInfo?.user.name ?? salesLeaderEmail;

    try {
      await revokeUserAccess(salesLeaderEmail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke access.';
      throw new Error(msg);
    }

    setSalesLeaders((prev) =>
      prev.map((sl) =>
        sl.user.email === salesLeaderEmail
          ? { ...sl, access: NOT_GRANTED_ACCESS }
          : sl
      )
    );
    setAccessHistory((prev) =>
      prev.map((entry) => {
        if (entry.salesLeader === slName && entry.status === 'active') {
          return { ...entry, revokedAt: now, status: 'revoked' as const };
        }
        return entry;
      })
    );
  }, [salesLeaders]);

  const deactivateAccount = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: u, error: lookupError } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
      if (lookupError) {
        return { success: false, error: lookupError.message };
      }
      if (!u) {
        return { success: false, error: 'User not found.' };
      }
      const { error: updateError } = await supabase.from('users').update({ active: false }).eq('id', u.id);
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      setRegisteredUsers((prev) =>
        prev.map((ru) =>
          ru.email.toLowerCase() === email.toLowerCase()
            ? { ...ru, active: false }
            : ru
        )
      );
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate account.';
      return { success: false, error: msg };
    }
  }, []);

  const reactivateAccount = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: u, error: lookupError } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
      if (lookupError) {
        return { success: false, error: lookupError.message };
      }
      if (!u) {
        return { success: false, error: 'User not found.' };
      }
      const { error: updateError } = await supabase.from('users').update({ active: true }).eq('id', u.id);
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      setRegisteredUsers((prev) =>
        prev.map((ru) =>
          ru.email.toLowerCase() === email.toLowerCase()
            ? { ...ru, active: true }
            : ru
        )
      );
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reactivate account.';
      return { success: false, error: msg };
    }
  }, []);

  const setError = useCallback((message: string) => {
    setState('error');
    setErrorState(message);
  }, []);

  const removeRememberedAccount = useCallback((email: string) => {
    const updated = loadRemembered().filter(
      (a) => a.email.toLowerCase() !== email.toLowerCase()
    );
    saveRemembered(updated);
    setRememberedAccounts(updated);
  }, []);

  const clearRememberedAccounts = useCallback(() => {
    saveRemembered([]);
    setRememberedAccounts([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        user,
        salesLeaderAccess,
        salesLeaders,
        accessHistory,
        rememberedAccounts,
        registeredUsers,
        deactivateAccount,
        reactivateAccount,
        error,
        signIn,
        signUp,
        switchRole,
        signOut,
        retry,
        grantAccess,
        revokeAccess,
        removeRememberedAccount,
        clearRememberedAccounts,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ROLE_CONFIG, type Role };
