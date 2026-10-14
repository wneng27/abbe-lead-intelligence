import type React from 'react';
import type { Opportunity } from './opportunities';
import type { Role } from './navigation';
import { getSlaStatus } from './sla';
import type { Status } from './tokens';

export function selectRoleScopedOpportunities(
  opps: Opportunity[],
  role: Role,
  userEmail: string,
  userDepartment?: string,
): Opportunity[] {
  if (role === 'administrator') return [...opps];
  if (role === 'sales_leader') {
    const dept = userDepartment ?? '';
    return opps.filter((o) => o.department === dept);
  }
  return opps.filter((o) => o.accountManager === userEmail);
}

export interface WorkflowTabConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  statuses: Status[] | null;
  unassignedOnly?: boolean;
  slaAttentionOnly?: boolean;
}

export function countByTab(
  roleScoped: Opportunity[],
  tab: WorkflowTabConfig
): number {
  if (tab.slaAttentionOnly) {
    return roleScoped.filter((o) => {
      const slaStatus = getSlaStatus(o.sla, o.status);
      return slaStatus.currentState === 'breached' || slaStatus.currentState === 'due_soon';
    }).length;
  }
  if (tab.statuses === null) return roleScoped.length;
  let result = roleScoped.filter((o) => tab.statuses!.includes(o.status));
  if (tab.unassignedOnly) {
    result = result.filter((o) => !o.accountManager);
  }
  return result.length;
}

export function filterByTab(
  roleScoped: Opportunity[],
  tab: WorkflowTabConfig
): Opportunity[] {
  if (tab.slaAttentionOnly) {
    return roleScoped.filter((o) => {
      const slaStatus = getSlaStatus(o.sla, o.status);
      return slaStatus.currentState === 'breached' || slaStatus.currentState === 'due_soon';
    });
  }
  if (tab.statuses === null) return roleScoped;
  let result = roleScoped.filter((o) => tab.statuses!.includes(o.status));
  if (tab.unassignedOnly) {
    result = result.filter((o) => !o.accountManager);
  }
  return result;
}
