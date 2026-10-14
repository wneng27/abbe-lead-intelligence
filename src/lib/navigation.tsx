import type { NavItem } from '@/components/ui';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Activity,
  Settings,
} from 'lucide-react';

export type Role = 'administrator' | 'sales_leader' | 'account_manager';

export const VALID_ROLES: readonly Role[] = ['administrator', 'sales_leader', 'account_manager'];

export function isValidRole(value: unknown): value is Role {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

export interface RoleConfig {
  id: Role;
  label: string;
  shortLabel: string;
  navItems: NavItem[];
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  administrator: {
    id: 'administrator',
    label: 'Administrator',
    shortLabel: 'Admin',
    navItems: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Opportunities', icon: <Briefcase className="h-4 w-4" /> },
      { label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
      { label: 'Users & Access', icon: <Users className="h-4 w-4" /> },
      { label: 'Activity', icon: <Activity className="h-4 w-4" /> },
      { label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
  sales_leader: {
    id: 'sales_leader',
    label: 'Sales Department',
    shortLabel: 'Sales Dept',
    navItems: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Opportunities', icon: <Briefcase className="h-4 w-4" /> },
      { label: 'Team', icon: <Users className="h-4 w-4" /> },
      { label: 'Activity', icon: <Activity className="h-4 w-4" /> },
    ],
  },
  account_manager: {
    id: 'account_manager',
    label: 'Account Manager',
    shortLabel: 'Manager',
    navItems: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'My Opportunities', icon: <Briefcase className="h-4 w-4" /> },
    ],
  },
};

export const ROLE_LIST: RoleConfig[] = [
  ROLE_CONFIG.administrator,
  ROLE_CONFIG.sales_leader,
  ROLE_CONFIG.account_manager,
];

export const SIGNUP_ROLES: RoleConfig[] = [
  ROLE_CONFIG.sales_leader,
  ROLE_CONFIG.account_manager,
];

export interface DemoUser {
  name: string;
  email: string;
  role: Role;
}

export const DEMO_USERS: Partial<Record<Role, DemoUser>> = {};

export type AccessState = 'active' | 'expiring_soon' | 'expired' | 'not_granted';

export interface AccessRecord {
  access_granted_at: number | null;
  access_expires_at: number | null;
  access_granted_by: string | null;
  access_status: AccessState;
}

export const DEFAULT_ACCESS_DURATION_HOURS = 24;
export const EXPIRING_THRESHOLD_MS = 60 * 60 * 1000;

export const NOT_GRANTED_ACCESS: AccessRecord = {
  access_granted_at: null,
  access_expires_at: null,
  access_granted_by: null,
  access_status: 'not_granted',
};

export function createAccessRecord(grantedAt: number, grantedBy: string, durationHours: number = DEFAULT_ACCESS_DURATION_HOURS): AccessRecord {
  return {
    access_granted_at: grantedAt,
    access_expires_at: grantedAt + durationHours * 60 * 60 * 1000,
    access_granted_by: grantedBy,
    access_status: 'active',
  };
}

export function computeAccessState(
  expiresAt: number | null,
  now: number
): AccessState {
  if (expiresAt === null) return 'not_granted';
  const remaining = expiresAt - now;
  if (remaining <= 0) return 'expired';
  if (remaining <= EXPIRING_THRESHOLD_MS) return 'expiring_soon';
  return 'active';
}

export function formatTimeRemaining(expiresAt: number | null, now: number): string {
  if (expiresAt === null) return 'Not granted';
  const remaining = expiresAt - now;
  if (remaining <= 0) return 'Expired';
  const totalMinutes = Math.floor(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTimestamp(ts: number | null): string {
  if (ts === null) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const ALL_PAGES = [
  'Dashboard',
  'Opportunities',
  'My Opportunities',
  'Users & Access',
  'Departments',
  'Team',
  'Activity',
  'Settings',
] as const;

export type PageName = (typeof ALL_PAGES)[number];

export const PAGE_PERMISSIONS: Record<Role, readonly PageName[]> = {
  administrator: [
    'Dashboard',
    'Opportunities',
    'Departments',
    'Users & Access',
    'Activity',
    'Settings',
  ] as const,
  sales_leader: [
    'Dashboard',
    'Opportunities',
    'Team',
    'Activity',
  ] as const,
  account_manager: [
    'Dashboard',
    'My Opportunities',
  ] as const,
};

export function canAccess(role: Role, page: string): boolean {
  const allowed = PAGE_PERMISSIONS[role];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(page);
}

export const PAGE_DESCRIPTIONS: Record<string, { title: string; description: string; primaryActionLabel?: string }> = {
  Dashboard: {
    title: 'Dashboard',
    description: 'Overview of your lead intelligence pipeline and screening activity.',
    primaryActionLabel: 'New Opportunity',
  },
  Opportunities: {
    title: 'Opportunities',
    description: 'All discovered and tracked business opportunities in the pre-CRM pipeline.',
    primaryActionLabel: 'New Opportunity',
  },
  'My Opportunities': {
    title: 'My Opportunities',
    description: 'Opportunities assigned to you for screening and review.',
    primaryActionLabel: 'New Opportunity',
  },
  'Users & Access': {
    title: 'Users & Access',
    description: 'Manage user accounts, roles, and access permissions.',
  },
  Departments: {
    title: 'Departments',
    description: 'Manage departments and team structures.',
  },
  Team: {
    title: 'Team',
    description: 'View and manage your team members and assignments.',
  },
  Activity: {
    title: 'Activity',
    description: 'Audit trail of all actions across the intelligence platform.',
  },
  Settings: {
    title: 'Settings',
    description: 'System configuration and preferences.',
  },
};
