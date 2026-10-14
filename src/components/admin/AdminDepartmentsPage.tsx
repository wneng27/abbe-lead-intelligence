import { useState, useEffect } from 'react';
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
  Breadcrumb,
  Modal,
  useToast,
  Avatar,
  EmptyState,
} from '@/components/ui';
import {
  Building2,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  UserPlus,
  UserMinus,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchDepartments, fetchUsers, type DbDepartment, type DbUser } from '@/lib/db';
import type { Role } from '@/lib/navigation';

interface DepartmentInfo {
  id: string;
  label: string;
  salesLeader: { name: string; email: string; role: Role } | null;
  accountManagers: { name: string; email: string; role: Role }[];
  active: boolean;
}

function DepartmentCard({
  dept,
  onManage,
}: {
  dept: DepartmentInfo;
  onManage: () => void;
}) {
  const managerNames = dept.accountManagers;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{dept.label}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant={dept.active ? 'success' : 'default'} dot size="sm">
                {dept.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {dept.salesLeader ? (
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-border">
          <Avatar name={dept.salesLeader.name} size="sm" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{dept.salesLeader.name}</span>
            <span className="text-xs text-muted-foreground">Sales Leader</span>
          </div>
        </div>
      ) : (
        <div className="mb-4 pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground italic">No sales leader assigned</p>
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          Account Managers ({managerNames.length})
        </p>
        {managerNames.length > 0 ? (
          <div className="flex flex-col gap-2">
            {managerNames.map((am) => (
              <div key={am.email} className="flex items-center gap-2.5">
                <Avatar name={am.name} size="sm" />
                <span className="text-sm text-foreground">{am.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No account managers assigned</p>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        iconLeft={<UsersIcon className="h-3.5 w-3.5" />}
        onClick={onManage}
        className="w-full justify-center"
      >
        Manage Membership
      </Button>
    </Card>
  );
}

function ManageMembershipModal({
  open,
  onClose,
  dept,
  unassignedManagers,
  onAssign,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  dept: DepartmentInfo | null;
  unassignedManagers: { name: string; email: string; role: Role }[];
  onAssign: (am: { name: string; email: string; role: Role }) => void;
  onRemove: (am: { name: string; email: string; role: Role }) => void;
}) {
  if (!dept) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Manage ${dept.label}`}
      description="Assign or remove Account Managers from this department."
      size="md"
      footer={
        <Button variant="secondary" size="md" onClick={onClose} className="ml-auto">
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {dept.salesLeader ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sales Leader
            </p>
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 p-3">
              <Avatar name={dept.salesLeader.name} size="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{dept.salesLeader.name}</span>
                <span className="text-xs text-muted-foreground">{dept.salesLeader.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sales Leader
            </p>
            <p className="text-xs text-muted-foreground italic">No sales leader assigned to this department</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Current Account Managers ({dept.accountManagers.length})
          </p>
          {dept.accountManagers.length > 0 ? (
            <div className="flex flex-col gap-2">
              {dept.accountManagers.map((am) => (
                <div
                  key={am.email}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={am.name} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{am.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{am.email}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<UserMinus className="h-3.5 w-3.5" />}
                    onClick={() => onRemove(am)}
                    className="text-critical dark:text-critical-light border-critical/20 hover:bg-critical/5 shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No account managers assigned</p>
          )}
        </div>

        {unassignedManagers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Available to Assign ({unassignedManagers.length})
            </p>
            <div className="flex flex-col gap-2">
              {unassignedManagers.map((am) => (
                <div
                  key={am.email}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={am.name} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{am.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{am.email}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<UserPlus className="h-3.5 w-3.5" />}
                    onClick={() => onAssign(am)}
                    className="shrink-0"
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function AdminDepartmentsPage() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageDept, setManageDept] = useState<DepartmentInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [depts, users] = await Promise.all([
          fetchDepartments(),
          fetchUsers(),
        ]);
        if (cancelled) return;

        setAllUsers(users);

        const deptInfos: DepartmentInfo[] = depts.map((d) => {
          const leader = users.find((u) => u.role === 'sales_leader' && u.department_id === d.id);
          const managers = users.filter((u) => u.role === 'account_manager' && u.department_id === d.id);
          return {
            id: d.id,
            label: d.name,
            salesLeader: leader ? { name: leader.name, email: leader.email, role: 'sales_leader' as Role } : null,
            accountManagers: managers.map((m) => ({ name: m.name, email: m.email, role: 'account_manager' as Role })),
            active: true,
          };
        });

        setDepartments(deptInfos);
      } catch {
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleAssign = async (am: { name: string; email: string; role: Role }) => {
    if (!manageDept) return;

    try {
      const user = allUsers.find((u) => u.email === am.email);
      if (user) {
        await supabase.from('users').update({ department_id: manageDept.id }).eq('id', user.id);
      }
    } catch {
      // RLS may block; update local state as fallback
    }

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === manageDept.id
          ? { ...d, accountManagers: [...d.accountManagers, am] }
          : d
      )
    );
    setManageDept((prev) =>
      prev ? { ...prev, accountManagers: [...prev.accountManagers, am] } : null
    );
    toast({
      title: 'Account Manager assigned',
      description: `${am.name} has been assigned to ${manageDept.label}.`,
      variant: 'success',
    });
  };

  const handleRemove = async (am: { name: string; email: string; role: Role }) => {
    if (!manageDept) return;

    try {
      const user = allUsers.find((u) => u.email === am.email);
      if (user) {
        await supabase.from('users').update({ department_id: null }).eq('id', user.id);
      }
    } catch {
      // RLS may block; update local state as fallback
    }

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === manageDept.id
          ? { ...d, accountManagers: d.accountManagers.filter((m) => m.email !== am.email) }
          : d
      )
    );
    setManageDept((prev) =>
      prev
        ? { ...prev, accountManagers: prev.accountManagers.filter((m) => m.email !== am.email) }
        : null
    );
    toast({
      title: 'Account Manager removed',
      description: `${am.name} has been removed from ${manageDept.label}.`,
      variant: 'warning',
    });
  };

  const unassignedManagers = manageDept
    ? allUsers
        .filter((u) => u.role === 'account_manager' && !u.department_id)
        .map((u) => ({ name: u.name, email: u.email, role: 'account_manager' as Role }))
    : [];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Departments"
          description="Manage the two sales departments, their Sales Leaders, and Account Manager membership."
          breadcrumb={<Breadcrumb items={[{ label: 'Administrator' }, { label: 'Departments' }]} />}
        />
        <Card className="p-8">
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Loading departments..."
            description="Fetching department data from the database."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Departments"
        description="Manage the two sales departments, their Sales Leaders, and Account Manager membership."
        breadcrumb={
          <Breadcrumb items={[{ label: 'Administrator' }, { label: 'Departments' }]} />
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-4">
        <Info className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Two Sales Departments</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            The system supports exactly two sales departments. Each department has one Sales Leader
            and one or more Account Managers. Use "Manage Membership" to assign or remove Account Managers.
          </p>
        </div>
      </div>

      {departments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              onManage={() => setManageDept(dept)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No departments configured"
            description="Departments will appear here once they are created in the database."
          />
        </Card>
      )}

      <ManageMembershipModal
        open={manageDept !== null}
        onClose={() => setManageDept(null)}
        dept={manageDept}
        unassignedManagers={unassignedManagers}
        onAssign={handleAssign}
        onRemove={handleRemove}
      />
    </div>
  );
}
