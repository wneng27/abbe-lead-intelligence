import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Table,
  type Column,
  Breadcrumb,
  Modal,
  ConfirmationModal,
  Drawer,
  useToast,
  Avatar,
  EmptyState,
  SearchInput,
} from '@/components/ui';
import {
  Shield,
  Clock,
  Building2,
  KeyRound,
  UserCog,
  CheckCircle2,
  XCircle,
  History,
  Users as UsersIcon,
  Eye,
  Mail,
  Briefcase,
  Activity,
  Ban,
  RotateCcw,
} from 'lucide-react';
import {
  useAuth,
  type SalesLeaderInfo,
  type AccessHistoryEntry,
  type RegisteredUser,
} from '@/lib/auth';
import { useAccess } from '@/lib/useAccess';
import {
  ROLE_CONFIG,
  formatTimestamp,
  DEFAULT_ACCESS_DURATION_HOURS,
  type AccessRecord,
  type AccessState,
  type Role,
} from '@/lib/navigation';

/* ─── Types ─── */

interface UserRow {
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
  createdAt: string | null;
  access: AccessRecord;
  lastActivity: string;
}

const accessStateConfig: Record<AccessState, { label: string; variant: 'success' | 'risk' | 'critical' | 'default' }> = {
  active: { label: 'Active', variant: 'success' },
  expiring_soon: { label: 'Expiring Soon', variant: 'risk' },
  expired: { label: 'Expired', variant: 'critical' },
  not_granted: { label: 'Not Granted', variant: 'default' },
};

const roleBadgeConfig: Record<Role, { label: string; variant: 'default' | 'gold' | 'outline' }> = {
  administrator: { label: 'Administrator', variant: 'gold' },
  sales_leader: { label: 'Sales Department', variant: 'outline' },
  account_manager: { label: 'Account Manager', variant: 'default' },
};

const roleDescription: Record<Role, string> = {
  administrator: 'Full system access to all pages, features, and administrative functions.',
  sales_leader: 'Access according to the configured access policy. Time-limited access windows granted by an Administrator.',
  account_manager: 'Access to opportunities assigned to or relevant to their role. Persistent access.',
};

/* ─── Sub-components ─── */

function AccessStatusCell({ access }: { access: AccessRecord }) {
  const info = useAccess(access);
  const config = accessStateConfig[info.state];
  return (
    <Badge variant={config.variant} dot size="sm">
      {config.label}
    </Badge>
  );
}

function AccessGrantedCell({ access }: { access: AccessRecord }) {
  if (access.access_granted_at === null) return <span className="text-sm text-muted-foreground">—</span>;
  return <span className="text-sm text-muted-foreground tabular-nums">{formatTimestamp(access.access_granted_at)}</span>;
}

function AccessExpiresCell({ access }: { access: AccessRecord }) {
  if (access.access_expires_at === null) return <span className="text-sm text-muted-foreground">—</span>;
  return <span className="text-sm text-muted-foreground tabular-nums">{formatTimestamp(access.access_expires_at)}</span>;
}

/* ─── Grant Modal ─── */

function GrantAccessModal({
  open,
  onClose,
  onConfirm,
  salesLeader,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  salesLeader: SalesLeaderInfo | null;
}) {
  if (!salesLeader) return null;
  const now = Date.now();
  const expires = now + DEFAULT_ACCESS_DURATION_HOURS * 60 * 60 * 1000;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Grant ${DEFAULT_ACCESS_DURATION_HOURS}-Hour Access`}
      description={`The access period begins immediately upon granting and expires exactly ${DEFAULT_ACCESS_DURATION_HOURS} hours later.`}
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<KeyRound className="h-4 w-4" />}
            onClick={onConfirm}
          >
            Grant Access
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
          <Avatar name={salesLeader.user.name} size="md" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{salesLeader.user.name}</span>
            <span className="text-xs text-muted-foreground">{salesLeader.user.email}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</p>
            <p className="mt-1.5 text-sm font-medium text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {salesLeader.department}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</p>
            <p className="mt-1.5 text-sm font-medium text-foreground">Sales Department</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Access Window</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Access starts</p>
              <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">{formatTimestamp(now)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Access expires</p>
              <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">{formatTimestamp(expires)}</p>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
            Expiration occurs exactly {DEFAULT_ACCESS_DURATION_HOURS} hours after access is granted. There are no extension options.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Revoke Modal ─── */

function RevokeAccessModal({
  open,
  onClose,
  onConfirm,
  salesLeader,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  salesLeader: SalesLeaderInfo | null;
}) {
  if (!salesLeader) return null;
  return (
    <ConfirmationModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Revoke access?"
      description={`This will immediately revoke ${salesLeader.user.name}'s system access. They will not be able to perform any further actions in the system until a new grant is issued. No data will be deleted — only access is removed.`}
      confirmLabel="Revoke Access"
      destructive
    />
  );
}

/* ─── Deactivate Account Modal ─── */

function DeactivateAccountModal({
  open,
  onClose,
  onConfirm,
  user,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: UserRow | null;
}) {
  if (!user) return null;
  return (
    <ConfirmationModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Remove account access?"
      description={`This will prevent ${user.name} from accessing the ABBE Lead Intelligence & Screening system. Continue?`}
      confirmLabel="Remove Account Access"
      destructive
    />
  );
}

/* ─── Actions cell ─── */

function ActionsCell({
  row,
  onView,
  onGrant,
  onRevoke,
  onDeactivate,
  onReactivate,
  isCurrentUser,
}: {
  row: UserRow;
  onView: (email: string) => void;
  onGrant: (email: string) => void;
  onRevoke: (email: string) => void;
  onDeactivate: (email: string) => void;
  onReactivate: (email: string) => void;
  isCurrentUser: boolean;
}) {
  const isSalesDirector = row.role === 'sales_leader';
  const access = row.access;
  const canGrant = access.access_status === 'not_granted' || access.access_status === 'expired';
  const canRevoke = access.access_status === 'active' || access.access_status === 'expiring_soon';

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        iconLeft={<Eye className="h-3.5 w-3.5" />}
        onClick={() => onView(row.email)}
      >
        View
      </Button>
      {isSalesDirector && canGrant && (
        <Button
          variant="outline"
          size="sm"
          iconLeft={<KeyRound className="h-3.5 w-3.5" />}
          onClick={() => onGrant(row.email)}
        >
          Grant
        </Button>
      )}
      {isSalesDirector && canRevoke && (
        <Button
          variant="outline"
          size="sm"
          iconLeft={<XCircle className="h-3.5 w-3.5" />}
          onClick={() => onRevoke(row.email)}
          className="text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5"
        >
          Revoke
        </Button>
      )}
      {!isCurrentUser && !row.active && (
        <Button
          variant="outline"
          size="sm"
          iconLeft={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={() => onReactivate(row.email)}
        >
          Reactivate
        </Button>
      )}
      {!isCurrentUser && row.active && (
        <Button
          variant="outline"
          size="sm"
          iconLeft={<Ban className="h-3.5 w-3.5" />}
          onClick={() => onDeactivate(row.email)}
          className="text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5"
        >
          Remove Access
        </Button>
      )}
    </div>
  );
}

/* ─── User Detail Drawer ─── */

function UserDetailDrawer({
  user,
  onClose,
  onGrant,
  onRevoke,
  onDeactivate,
  onReactivate,
  isCurrentUser,
}: {
  user: UserRow | null;
  onClose: () => void;
  onGrant: (email: string) => void;
  onRevoke: (email: string) => void;
  onDeactivate: (email: string) => void;
  onReactivate: (email: string) => void;
  isCurrentUser: boolean;
}) {
  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role];
  const isSalesDirector = user.role === 'sales_leader';
  const access = user.access;
  const canGrant = access.access_status === 'not_granted' || access.access_status === 'expired';
  const canRevoke = access.access_status === 'active' || access.access_status === 'expiring_soon';

  return (
    <Drawer
      open={user !== null}
      onClose={onClose}
      title="User Details"
      description="View user information, role, and access status."
      width="max-w-lg"
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button variant="secondary" size="md" onClick={onClose} className="ml-auto">
            Close
          </Button>
          {isSalesDirector && canGrant && (
            <Button
              variant="primary"
              size="md"
              iconLeft={<KeyRound className="h-4 w-4" />}
              onClick={() => onGrant(user.email)}
            >
              Grant Access
            </Button>
          )}
          {isSalesDirector && canRevoke && (
            <Button
              variant="outline"
              size="md"
              iconLeft={<XCircle className="h-4 w-4" />}
              onClick={() => onRevoke(user.email)}
              className="text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5"
            >
              Revoke Access
            </Button>
          )}
          {!isCurrentUser && !user.active && (
            <Button
              variant="outline"
              size="md"
              iconLeft={<RotateCcw className="h-4 w-4" />}
              onClick={() => onReactivate(user.email)}
            >
              Reactivate Account
            </Button>
          )}
          {!isCurrentUser && user.active && (
            <Button
              variant="outline"
              size="md"
              iconLeft={<Ban className="h-4 w-4" />}
              onClick={() => onDeactivate(user.email)}
              className="text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5"
            >
              Remove Account Access
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Profile header */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-4">
          <Avatar name={user.name} size="lg" />
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">{user.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="mt-1">
              <Badge variant={roleBadgeConfig[user.role].variant} size="sm">
                {roleBadgeConfig[user.role].label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Role description */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role & Permissions</p>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{roleConfig.label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{roleDescription[user.role]}</p>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Department
            </p>
            <p className="mt-1.5 text-sm font-medium text-foreground">{user.department}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Account Status
            </p>
            <div className="mt-1.5 flex flex-col gap-1">
              {!user.active ? (
                <Badge variant="critical" dot size="sm">Deactivated</Badge>
              ) : (
                <Badge variant="success" dot size="sm">Active</Badge>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Date Created
            </p>
            <p className="mt-1.5 text-sm font-medium text-foreground tabular-nums">
              {user.createdAt ? formatTimestamp(new Date(user.createdAt).getTime()) : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Last Activity
            </p>
            <p className="mt-1.5 text-sm font-medium text-foreground">{user.lastActivity}</p>
          </div>
          {isSalesDirector ? (
            <div className="rounded-lg border border-border p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                Access Status
              </p>
              <div className="mt-1.5">
                <AccessStatusCell access={access} />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                Access Status
              </p>
              <p className="mt-1.5 text-sm font-medium text-foreground">Persistent</p>
            </div>
          )}
        </div>

        {/* Access details for Sales Departments */}
        {isSalesDirector && (
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Access Window Details</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Access granted</p>
                <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">
                  {access.access_granted_at ? formatTimestamp(access.access_granted_at) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Access expires</p>
                <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">
                  {access.access_expires_at ? formatTimestamp(access.access_expires_at) : '—'}
                </p>
              </div>
              {access.access_granted_by && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Granted by</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{access.access_granted_by}</p>
                </div>
              )}
            </div>
            {!canGrant && !canRevoke && (
              <p className="mt-3 text-xs text-muted-foreground italic">
                No access actions available at this time.
              </p>
            )}
          </div>
        )}

        {/* Access policy note */}
        {isSalesDirector && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Sales Department access is time-limited per grant. When the period expires,
              access is automatically revoked and a new grant must be issued. There are no extension options.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ─── Access History ─── */

function AccessHistorySection({ history }: { history: AccessHistoryEntry[] }) {
  const historyColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'salesLeader',
      header: 'Sales Department',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        return <span className="font-medium text-foreground">{r.salesLeader}</span>;
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        return (
          <Badge variant={r.action === 'granted' ? 'success' : 'critical'} size="sm">
            {r.action === 'granted' ? 'Granted' : 'Revoked'}
          </Badge>
        );
      },
    },
    {
      key: 'grantedBy',
      header: 'Granted By',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        return <span className="text-sm text-muted-foreground">{r.grantedBy}</span>;
      },
    },
    {
      key: 'grantedAt',
      header: 'Granted At',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        return <span className="text-sm text-muted-foreground tabular-nums">{formatTimestamp(r.grantedAt)}</span>;
      },
    },
    {
      key: 'expiresAt',
      header: 'Expires At',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        return <span className="text-sm text-muted-foreground tabular-nums">{formatTimestamp(r.expiresAt)}</span>;
      },
    },
    {
      key: 'revokedAt',
      header: 'Revoked At',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        return r.revokedAt ? <span className="text-sm text-muted-foreground tabular-nums">{formatTimestamp(r.revokedAt)}</span> : <span className="text-sm text-muted-foreground">—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const r = row as unknown as AccessHistoryEntry;
        const variant = r.status === 'active' ? 'success' : r.status === 'revoked' ? 'critical' : 'default';
        const label = r.status === 'active' ? 'Active' : r.status === 'revoked' ? 'Revoked' : 'Expired';
        return <Badge variant={variant} dot size="sm">{label}</Badge>;
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-muted-foreground shrink-0">
            <History className="h-4.5 w-4.5" />
          </span>
          <div>
            <CardTitle>Access History</CardTitle>
            <CardDescription>
              Audit trail of all access grants and revocations for Sales Departments.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {history.length > 0 ? (
          <Table
            columns={historyColumns}
            data={history as unknown as Record<string, unknown>[]}
            rowKey={(row) => (row as unknown as AccessHistoryEntry).id}
          />
        ) : (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="No access history"
            description="Grant and revoke actions will be recorded here."
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main page ─── */

export function AdminUsersAccessPage() {
  const { user, salesLeaders, accessHistory, grantAccess, revokeAccess, deactivateAccount, reactivateAccount, registeredUsers } = useAuth();
  const { toast } = useToast();
  const [grantTarget, setGrantTarget] = useState<SalesLeaderInfo | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SalesLeaderInfo | null>(null);
  const [viewTarget, setViewTarget] = useState<UserRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allUsers = useMemo(() => {
    return registeredUsers;
  }, [registeredUsers]);

  const userRows: UserRow[] = useMemo(() => {
    return allUsers.map((u) => {
      const slInfo = salesLeaders.find((sl) => sl.user.email === u.email);
      const access = slInfo?.access ?? {
        access_granted_at: null,
        access_expires_at: null,
        access_granted_by: null,
        access_status: 'not_granted' as AccessState,
      };
      return {
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        active: u.active,
        createdAt: u.createdAt,
        access,
        lastActivity: '—',
      };
    });
  }, [allUsers, salesLeaders]);

  const filteredRows: UserRow[] = useMemo(() => {
    const sorted = [...userRows].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [userRows, searchQuery]);

  const handleGrant = async () => {
    if (!grantTarget) return;
    try {
      await grantAccess(grantTarget.user.email);
      toast({
        title: 'Access granted',
        description: `${DEFAULT_ACCESS_DURATION_HOURS}-hour access granted to ${grantTarget.user.name}`,
        variant: 'success',
      });
      setGrantTarget(null);
    } catch (err) {
      toast({
        title: 'Failed to grant access',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'error',
      });
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeAccess(revokeTarget.user.email);
      toast({
        title: 'Access revoked',
        description: `${revokeTarget.user.name} no longer has system access`,
        variant: 'warning',
      });
      setRevokeTarget(null);
    } catch (err) {
      toast({
        title: 'Failed to revoke access',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'error',
      });
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    const result = await deactivateAccount(deactivateTarget.email);
    if (result.success) {
      toast({
        title: 'Account access removed',
        description: `${deactivateTarget.name} can no longer access the system.`,
        variant: 'warning',
      });
      setDeactivateTarget(null);
    } else {
      toast({
        title: 'Failed to deactivate account',
        description: result.error ?? 'An unexpected error occurred.',
        variant: 'error',
      });
    }
  };

  const handleReactivate = async (email: string) => {
    const row = userRows.find((r) => r.email === email);
    const result = await reactivateAccount(email);
    if (result.success) {
      toast({
        title: 'Account reactivated',
        description: `${row?.name ?? email} can now access the system again.`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'Failed to reactivate account',
        description: result.error ?? 'An unexpected error occurred.',
        variant: 'error',
      });
    }
  };

  const handleViewClick = (email: string) => {
    const row = userRows.find((r) => r.email === email);
    if (row) setViewTarget(row);
  };

  const handleGrantFromRow = (email: string) => {
    setGrantTarget(salesLeaders.find((sl) => sl.user.email === email) ?? null);
  };

  const handleRevokeFromRow = (email: string) => {
    setRevokeTarget(salesLeaders.find((sl) => sl.user.email === email) ?? null);
  };

  const handleDeactivateFromRow = (email: string) => {
    const row = userRows.find((r) => r.email === email);
    if (row) setDeactivateTarget(row);
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => {
        const r = row as unknown as UserRow;
        return (
          <button
            className="flex items-center gap-2.5 text-left group"
            onClick={() => handleViewClick(r.email)}
          >
            <Avatar name={r.name} size="sm" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground group-hover:text-gold transition-colors">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.email}</span>
            </div>
          </button>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const r = row as unknown as UserRow;
        const config = roleBadgeConfig[r.role];
        return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => {
        const r = row as unknown as UserRow;
        return (
          <span className="flex items-center gap-1.5 text-sm text-foreground">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {r.department}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (row) => {
        const r = row as unknown as UserRow;
        if (!r.active) {
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="critical" dot size="sm">Deactivated</Badge>
            </div>
          );
        }
        return <Badge variant="success" dot size="sm">Active</Badge>;
      },
    },
    {
      key: 'accessStatus',
      header: 'Access Status',
      render: (row) => {
        const r = row as unknown as UserRow;
        if (r.role !== 'sales_leader') return <span className="text-sm text-muted-foreground">Persistent</span>;
        return <AccessStatusCell access={r.access} />;
      },
    },
    {
      key: 'granted',
      header: 'Access Granted',
      render: (row) => {
        const r = row as unknown as UserRow;
        if (r.role !== 'sales_leader') return <span className="text-sm text-muted-foreground">—</span>;
        return <AccessGrantedCell access={r.access} />;
      },
    },
    {
      key: 'expires',
      header: 'Access Expires',
      render: (row) => {
        const r = row as unknown as UserRow;
        if (r.role !== 'sales_leader') return <span className="text-sm text-muted-foreground">—</span>;
        return <AccessExpiresCell access={r.access} />;
      },
    },
    {
      key: 'createdAt',
      header: 'Date Created',
      render: (row) => {
        const r = row as unknown as UserRow;
        return (
          <span className="text-sm text-muted-foreground tabular-nums">
            {r.createdAt ? formatTimestamp(new Date(r.createdAt).getTime()) : '—'}
          </span>
        );
      },
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      render: (row) => {
        const r = row as unknown as UserRow;
        return <span className="text-sm text-muted-foreground">{r.lastActivity}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const r = row as unknown as UserRow;
        return (
          <ActionsCell
            row={r}
            onView={handleViewClick}
            onGrant={handleGrantFromRow}
            onRevoke={handleRevokeFromRow}
            onDeactivate={handleDeactivateFromRow}
            onReactivate={handleReactivate}
            isCurrentUser={r.email.toLowerCase() === user?.email?.toLowerCase()}
          />
        );
      },
    },
  ];

  const activeAccessCount = salesLeaders.filter((sl) => {
    const state = sl.access.access_status;
    return state === 'active' || state === 'expiring_soon';
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users & Access"
        description="Manage user accounts, roles, and access permissions. Sales Department access is time-limited per grant."
        breadcrumb={
          <Breadcrumb items={[{ label: 'Administrator' }, { label: 'Users & Access' }]} />
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Users</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{allUsers.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <UserCog className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sales Departments</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{salesLeaders.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Managers</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{allUsers.filter((u) => u.role === 'account_manager').length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Access</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{activeAccessCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sales Leader Access Management */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-muted-foreground shrink-0">
              <KeyRound className="h-4.5 w-4.5" />
            </span>
            <div>
              <CardTitle>Sales Leader Access Management</CardTitle>
              <CardDescription>
                Grant or renew 24-hour access for Sales Department Leaders. Only users with no access or expired access appear here.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const eligible = salesLeaders.filter((sl) => {
              const info = useAccess(sl.access);
              return info.isNotGranted || info.isExpired;
            });
            const active = salesLeaders.filter((sl) => {
              const info = useAccess(sl.access);
              return info.isActive || info.isExpiringSoon;
            });

            if (eligible.length === 0 && active.length === 0) {
              return (
                <EmptyState
                  icon={<UsersIcon className="h-6 w-6" />}
                  title="No Sales Leaders registered"
                  description="Sales Department Leaders will appear here once they create an account."
                />
              );
            }

            const accessMgmtColumns: Column<Record<string, unknown>>[] = [
              {
                key: 'name',
                header: 'Name',
                render: (row) => {
                  const r = row as unknown as SalesLeaderInfo;
                  return (
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.user.name} size="sm" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{r.user.name}</span>
                        <span className="text-xs text-muted-foreground">{r.user.email}</span>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'department',
                header: 'Department',
                render: (row) => {
                  const r = row as unknown as SalesLeaderInfo;
                  return (
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.department}
                    </span>
                  );
                },
              },
              {
                key: 'accessStatus',
                header: 'Access Status',
                render: (row) => {
                  const r = row as unknown as SalesLeaderInfo;
                  return <AccessStatusCell access={r.access} />;
                },
              },
              {
                key: 'expires',
                header: 'Expires At',
                render: (row) => {
                  const r = row as unknown as SalesLeaderInfo;
                  const info = useAccess(r.access);
                  if (info.isActive || info.isExpiringSoon) {
                    return (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatTimestamp(r.access.access_expires_at)}
                      </span>
                    );
                  }
                  return <span className="text-sm text-muted-foreground">—</span>;
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (row) => {
                  const r = row as unknown as SalesLeaderInfo;
                  const info = useAccess(r.access);
                  if (info.isActive || info.isExpiringSoon) {
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground italic">Access active</span>
                        <Button
                          variant="outline"
                          size="sm"
                          iconLeft={<XCircle className="h-3.5 w-3.5" />}
                          onClick={() => handleRevokeFromRow(r.user.email)}
                          className="text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5"
                        >
                          Revoke
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={<KeyRound className="h-3.5 w-3.5" />}
                      onClick={() => handleGrantFromRow(r.user.email)}
                    >
                      Grant Access
                    </Button>
                  );
                },
              },
            ];

            const allLeaders = [...eligible, ...active].sort((a, b) =>
              a.user.name.localeCompare(b.user.name, undefined, { sensitivity: 'base' })
            );

            return (
              <Table
                columns={accessMgmtColumns}
                data={allLeaders as unknown as Record<string, unknown>[]}
                rowKey={(row) => (row as unknown as SalesLeaderInfo).user.email}
              />
            );
          })()}
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                All internal application users and their current access status. Click any user to view full details.
              </CardDescription>
            </div>
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search by name or email…"
                aria-label="Search users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRows.length > 0 ? (
            <Table
              columns={columns}
              data={filteredRows as unknown as Record<string, unknown>[]}
              rowKey={(row) => (row as unknown as UserRow).email}
            />
          ) : userRows.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title="No users registered"
              description="Users will appear here once they sign up for an account."
            />
          ) : (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title="No users found"
              description="Try a different name or email, or clear the search to see all users."
            />
          )}
        </CardContent>
      </Card>

      {/* Access policy info */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-foreground">Access Policy</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only Sales Departments are subject to the time-limited access window. Administrators
              and Account Managers have persistent access. Each Sales Department grant provides
              exactly {DEFAULT_ACCESS_DURATION_HOURS} hours from the grant timestamp. When the period expires, access is
              automatically revoked and a new grant must be issued. There are no extension options.
            </p>
          </div>
        </div>
      </Card>

      {/* Access History */}
      <AccessHistorySection history={accessHistory} />

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={viewTarget}
        onClose={() => setViewTarget(null)}
        onGrant={handleGrantFromRow}
        onRevoke={handleRevokeFromRow}
        onDeactivate={handleDeactivateFromRow}
        onReactivate={handleReactivate}
        isCurrentUser={viewTarget?.email.toLowerCase() === user?.email?.toLowerCase()}
      />

      {/* Modals */}
      <GrantAccessModal
        open={grantTarget !== null}
        onClose={() => setGrantTarget(null)}
        onConfirm={handleGrant}
        salesLeader={grantTarget}
      />
      <RevokeAccessModal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        salesLeader={revokeTarget}
      />
      <DeactivateAccountModal
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        user={deactivateTarget}
      />
    </div>
  );
}
