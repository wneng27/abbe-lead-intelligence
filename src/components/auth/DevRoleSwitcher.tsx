import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui';
import {
  Beaker,
  ChevronDown,
  Check,
  Shield,
  Briefcase,
  Users,
} from 'lucide-react';
import { ROLE_LIST, type Role } from '@/lib/navigation';
import { useAuth } from '@/lib/auth';

const roleIcon: Record<Role, React.ReactNode> = {
  administrator: <Shield className="h-3.5 w-3.5" />,
  sales_leader: <Briefcase className="h-3.5 w-3.5" />,
  account_manager: <Users className="h-3.5 w-3.5" />,
};

interface DevRoleSwitcherProps {
  onSwitched?: () => void;
}

export function DevRoleSwitcher({ onSwitched }: DevRoleSwitcherProps) {
  const { user, switchRole } = useAuth();
  const [justSwitched, setJustSwitched] = useState(false);

  const currentRole = user?.role;

  const handleSwitch = (role: Role) => {
    switchRole(role);
    setJustSwitched(true);
    window.setTimeout(() => setJustSwitched(false), 1200);
    onSwitched?.();
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/5 px-2 py-1">
      <div className="flex items-center gap-1 text-warning shrink-0" title="Development role switcher — not visible in production">
        <Beaker className="h-3.5 w-3.5" />
        <span className="text-2xs font-semibold uppercase tracking-wide hidden xl:inline">Dev</span>
      </div>
      <DropdownMenu
        trigger={
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-warning/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center gap-1.5">
              {currentRole && roleIcon[currentRole]}
              <span className="hidden sm:inline">
                {ROLE_LIST.find((r) => r.id === currentRole)?.label ?? 'Select role'}
              </span>
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        }
        items={[
          {
            label: 'DEV: Switch role (mock auth)',
            onClick: () => {},
            disabled: true,
          },
          { label: '', separator: true },
          ...ROLE_LIST.map((r) => ({
            label: r.label,
            icon: r.id === currentRole ? <Check className="h-3.5 w-3.5 text-success" /> : roleIcon[r.id],
            onClick: () => handleSwitch(r.id),
          })),
        ]}
      />
      {justSwitched && (
        <span className="text-2xs text-success font-medium animate-fade-in hidden lg:inline">
          switched
        </span>
      )}
    </div>
  );
}
