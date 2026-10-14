import { useState, useMemo } from 'react';
import { Plus, ShieldX, ShieldOff } from 'lucide-react';
import {
  AppShell,
  Sidebar,
  Header,
  Avatar,
  Button,
  ToastProvider,
  NotificationBell,
  type NavItem,
} from '@/components/ui';
import { AccessStatusBadge } from '@/components/AccessStatusBadge';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { LoginPage } from '@/components/auth/LoginPage';
import { ExpiredAccessPage } from '@/components/auth/ExpiredAccessPage';
import { NotGrantedAccessPage } from '@/components/auth/NotGrantedAccessPage';
import { FullScreenError, FullScreenLoading } from '@/components/auth/FullScreenStates';
import { AdminUsersAccessPage } from '@/components/admin/AdminUsersAccessPage';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminDepartmentsPage } from '@/components/admin/AdminDepartmentsPage';
import { AdminSettingsPage } from '@/components/admin/AdminSettingsPage';
import { OpportunitiesPage } from '@/components/admin/OpportunitiesPage';
import type { WorkflowTabKey } from '@/components/admin/OpportunitiesPage';
import { OpportunityDetailPage } from '@/components/admin/OpportunityDetailPage';
import { RoleDashboard, ActivityPage, TeamPage } from '@/components/admin/SimplePages';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useAccess } from '@/lib/useAccess';
import { StoreProvider, useStore } from '@/lib/store';
import { selectRoleScopedOpportunities } from '@/lib/selectors';
import {
  ROLE_CONFIG,
  canAccess,
  isValidRole,
  PAGE_DESCRIPTIONS,
  type Role,
} from '@/lib/navigation';

/* ─── Theme hook ─── */

function useTheme() {
  const [isDark, setIsDark] = useState(false);
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };
  return { isDark, toggle };
}

/* ─── ABBE branding ─── */

function AbbéLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/assets/images/image.png"
        alt="ABBÉ"
        className="h-8 w-8 rounded-lg object-cover shrink-0"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
          ABBÉ
        </span>
        <span className="text-2xs text-sidebar-muted">Lead Intelligence &amp; Screening</span>
      </div>
    </div>
  );
}

/* ─── Inline unauthorized (inside app shell) ─── */

function UnauthorizedPageInline({
  attemptedPage,
  onGoHome,
}: {
  attemptedPage: string;
  onGoHome: () => void;
}) {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_CONFIG[user.role].label : 'your role';

  return (
    <div className="max-w-md w-full flex flex-col items-center text-center px-4 py-12">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-critical/10 text-critical dark:text-critical-light">
        <ShieldX className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-foreground tracking-tight">
        You don&apos;t have access to this area
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        The <span className="font-medium text-foreground">{attemptedPage}</span>{' '}
        page is not available to {roleLabel}s. If you believe this is an error,
        contact your administrator to request the appropriate access.
      </p>
      <div className="mt-5">
        <Button onClick={onGoHome}>Go to Dashboard</Button>
      </div>
    </div>
  );
}

/* ─── Sales Leader access gate ─── */

function SalesLeaderAccessGate() {
  const { salesLeaderAccess } = useAuth();
  const access = useAccess(salesLeaderAccess);

  if (access.isNotGranted) {
    return <NotGrantedAccessPage />;
  }

  if (access.isExpired) {
    return <ExpiredAccessPage />;
  }

  return (
    <AuthenticatedApp />
  );
}

/* ─── Main authenticated application ─── */

function AuthenticatedApp() {
  const { user, salesLeaderAccess, signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const [activePage, setActivePage] = useState('Dashboard');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<WorkflowTabKey | undefined>(undefined);

  const navigateTo = (page: string) => {
    setSelectedOppId(null);
    setActivePage(page);
  };

  const role = user!.role;
  if (!isValidRole(role)) {
    return (
      <FullScreenError
        message={`Your account role "${role}" could not be recognized. Please contact an administrator to correct your account.`}
        onRetry={signOut}
      />
    );
  }
  const roleConfig = ROLE_CONFIG[role];
  const isSalesLeader = role === 'sales_leader';
  const access = useAccess(salesLeaderAccess);
  const { getOpportunities } = useStore();

  const opportunityCount = useMemo(
    () => selectRoleScopedOpportunities(getOpportunities(), role, user!.email, user!.department).length,
    [getOpportunities, role, user]
  );

  const pageMeta = useMemo(() => {
    return PAGE_DESCRIPTIONS[activePage] || { title: activePage, description: '' };
  }, [activePage]);

  const hasAccess = canAccess(role, activePage);

  const navItems: NavItem[] = roleConfig.navItems.map((item) => ({
    ...item,
    active: item.label === activePage,
    onClick: () => navigateTo(item.label),
    badge: (item.label === 'Opportunities' || item.label === 'My Opportunities')
      ? opportunityCount
      : undefined,
  }));


  const headerUser = {
    name: user!.name,
    email: user!.email,
    roleLabel: roleConfig.label,
    department: user!.department,
  };

  const showAccessBadge = isSalesLeader && access.isActive;
  const showExpiringBadge = isSalesLeader && access.isExpiringSoon;
  const showExpiredBadge = isSalesLeader && access.isExpired;
  const showNotGrantedBadge = isSalesLeader && access.isNotGranted;
  const accessBlocked = isSalesLeader && (access.isExpired || access.isNotGranted);

  return (
    <AppShell
      sidebar={
        <Sidebar
          navItems={navItems}
          logo={<AbbéLogo />}
          footer={
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-hover/50">
              <Avatar name={user!.name} size="sm" />
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <span className="text-xs font-medium text-sidebar-foreground truncate">
                  {user!.name}
                </span>
                <span className="text-2xs text-sidebar-muted truncate">
                  {roleConfig.label}
                </span>
              </div>
            </div>
          }
        />
      }
      header={
        <Header
          title={pageMeta.title}
          onToggleTheme={toggle}
          isDark={isDark}
          user={headerUser}
          onSignOut={signOut}
          onSettingsClick={() => navigateTo('Settings')}

          actions={
            <>
              {(showAccessBadge || showExpiringBadge || showExpiredBadge || showNotGrantedBadge) && (
                <AccessStatusBadge
                  record={salesLeaderAccess}
                  className="hidden xl:flex"
                />
              )}
              <NotificationBell />
            </>
          }
        />
      }
    >
      {accessBlocked ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {access.isNotGranted ? (
            <NotGrantedAccessInline onSignIn={signOut} />
          ) : (
            <ExpiredAccessInline onSignIn={signOut} />
          )}
        </div>
      ) : (
        <>
          <div className={selectedOppId ? 'hidden' : ''}>
            {!hasAccess ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <UnauthorizedPageInline
                  attemptedPage={activePage}
                  onGoHome={() => navigateTo('Dashboard')}
                />
              </div>
            ) : activePage === 'Users & Access' && role === 'administrator' ? (
              <AdminUsersAccessPage />
            ) : activePage === 'Departments' && role === 'administrator' ? (
              <AdminDepartmentsPage />
            ) : activePage === 'Settings' && role === 'administrator' ? (
              <AdminSettingsPage />
            ) : activePage === 'Dashboard' && role === 'administrator' ? (
              <AdminDashboard onNavigate={navigateTo} onNavigateToTab={(tab) => { setInitialTab(tab); navigateTo('Opportunities'); }} />
            ) : activePage === 'Dashboard' && (role === 'sales_leader' || role === 'account_manager') ? (
              <RoleDashboard role={role} onNavigate={navigateTo} onNavigateToTab={(tab) => { setInitialTab(tab); navigateTo('Opportunities'); }} onSelectOpportunity={setSelectedOppId} />
            ) : activePage === 'Activity' ? (
              <ActivityPage role={role} onSelectOpportunity={setSelectedOppId} />
            ) : activePage === 'Team' && role === 'sales_leader' ? (
              <TeamPage onNavigate={navigateTo} />
            ) : activePage === 'Opportunities' && role === 'administrator' ? (
              <OpportunitiesPage pageLabel="Opportunities" initialTab={initialTab} onSelectOpportunity={setSelectedOppId} />
            ) : activePage === 'Opportunities' && role === 'sales_leader' ? (
              <OpportunitiesPage pageLabel="Opportunities" initialTab={initialTab} onSelectOpportunity={setSelectedOppId} />
            ) : activePage === 'My Opportunities' && role === 'account_manager' ? (
              <OpportunitiesPage pageLabel="My Opportunities" initialTab={initialTab} onSelectOpportunity={setSelectedOppId} />
            ) : (
              <PlaceholderPage
                title={pageMeta.title}
                description={pageMeta.description}
                breadcrumbs={[roleConfig.label, activePage]}
                role={role}
                primaryAction={
                  pageMeta.primaryActionLabel ? (
                    <Button size="sm" iconLeft={<Plus className="h-4 w-4" />} disabled>
                      {pageMeta.primaryActionLabel}
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
          {selectedOppId && (
            <OpportunityDetailPage
              opportunityId={selectedOppId}
              onBack={() => setSelectedOppId(null)}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

/* Inline not-granted access (inside app shell) */

function NotGrantedAccessInline({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="max-w-md w-full flex flex-col items-center text-center px-4 py-12">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-foreground tracking-tight">
        System access has not been granted
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        An Administrator needs to grant you access before you can use
        the system. Please contact your administrator to request access.
      </p>
      <div className="mt-5">
        <Button variant="secondary" onClick={onSignIn}>
          Return to Log In
        </Button>
      </div>
    </div>
  );
}

/* Inline expired access (inside app shell, not full screen) */

function ExpiredAccessInline({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="max-w-md w-full flex flex-col items-center text-center px-4 py-12">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-critical/10 text-critical dark:text-critical-light">
        <ShieldX className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-foreground tracking-tight">
        Your system access has expired
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Your access period has ended. Please contact an Administrator to
        request access again.
      </p>
      <div className="mt-5">
        <Button variant="secondary" onClick={onSignIn}>
          Return to Log In
        </Button>
      </div>
    </div>
  );
}

/* ─── Root app — routes auth states ─── */

function AppRoot() {
  const { state, retry, error, user } = useAuth();

  switch (state) {
    case 'loading':
      return <FullScreenLoading />;
    case 'unauthenticated':
      return <LoginPage />;
    case 'error':
      return (
        <FullScreenError
          message={error ?? 'We could not load the application right now.'}
          onRetry={retry}
        />
      );
    case 'authenticated':
      if (user?.role === 'sales_leader') {
        return <SalesLeaderAccessGate />;
      }
      return <AuthenticatedApp />;
    default:
      return <LoginPage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ToastProvider>
          <AppRoot />
        </ToastProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export { useAuth, type Role };
