import { useState, useEffect } from 'react';
import { Button, Input, Avatar, Select } from '@/components/ui';
import {
  Shield,
  Briefcase,
  Users,
  CheckCircle2,
  Lock,
  Mail,
  X,
  ChevronRight,
  UserPlus,
  User as UserIcon,
} from 'lucide-react';
import {
  type Role,
  ROLE_CONFIG,
} from '@/lib/navigation';
import { useAuth, type RememberedAccount } from '@/lib/auth';

const DEPARTMENTS = ['Enterprise', 'Mid-Market', 'Strategic Accounts'];



const roleIconSmall: Record<Role, React.ReactNode> = {
  administrator: <Shield className="h-3.5 w-3.5" />,
  sales_leader: <Briefcase className="h-3.5 w-3.5" />,
  account_manager: <Users className="h-3.5 w-3.5" />,
};

const roleLabel: Record<Role, string> = {
  administrator: 'Administrator',
  sales_leader: 'Sales Department',
  account_manager: 'Account Manager',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── Returning Account Card ─── */

function ReturningAccountCard({
  account,
  onSelect,
  onRemove,
}: {
  account: RememberedAccount;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-150 hover:border-gold/40 hover:bg-gold/5">
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <Avatar name={account.name} size="md" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground truncate">{account.name}</span>
          <span className="text-xs text-muted-foreground truncate">{account.email}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-muted-foreground">{roleIconSmall[account.role]}</span>
            <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wide">
              {roleLabel[account.role]}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-gold transition-colors shrink-0" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${account.email} from saved accounts`}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-critical dark:hover:text-critical-light hover:bg-critical/5 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Returning Accounts List ─── */

function ReturningAccounts({
  accounts,
  onSelect,
  onRemove,
  onUseOther,
}: {
  accounts: RememberedAccount[];
  onSelect: (account: RememberedAccount) => void;
  onRemove: (email: string) => void;
  onUseOther: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Mail className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">Continue as</span>
      </div>
      <div className="flex flex-col gap-2">
        {accounts.map((account) => (
          <ReturningAccountCard
            key={account.email}
            account={account}
            onSelect={() => onSelect(account)}
            onRemove={() => onRemove(account.email)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onUseOther}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-left underline-offset-4 hover:underline"
      >
        Use a different account
      </button>
    </div>
  );
}

/* ─── Preselected Account Banner ─── */

function PreselectedAccountBanner({
  account,
  onClear,
}: {
  account: RememberedAccount;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
      <Avatar name={account.name} size="md" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground truncate">{account.name}</span>
        <span className="text-xs text-muted-foreground truncate">{account.email}</span>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Choose a different account"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Signup Form ─── */

function SignupForm({ onBack }: { onBack: () => void }) {
  const { signUp, state } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('administrator');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string; form?: string }>({});
  const isSubmitting = state === 'loading';

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Full name is required.';
    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!password) {
      next.password = 'Password is required.';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      next.confirm = 'Passwords do not match.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const dept = role === 'administrator' ? undefined : (department || undefined);
    const result = await signUp(email, password, role, name.trim(), dept);
    if (!result.success) {
      setErrors({ form: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Input
        label="Full Name"
        type="text"
        placeholder="Jane Doe"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
        }}
        error={errors.name}
        iconLeft={<UserIcon className="h-4 w-4" />}
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
        }}
        error={errors.email}
        iconLeft={<Mail className="h-4 w-4" />}
        autoComplete="email"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          error={errors.password}
          autoComplete="new-password"
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
          }}
          error={errors.confirm}
          autoComplete="new-password"
        />
      </div>
      <Select
        label="Role"
        value={role}
        onChange={(v) => {
          setRole(v as Role);
          if (v === 'administrator') setDepartment('');
        }}
        options={[
          { value: 'administrator', label: 'Administrator' },
          { value: 'sales_leader', label: 'Sales Department' },
          { value: 'account_manager', label: 'Account Manager' },
        ]}
      />
      {role !== 'administrator' && (
        <Select
          label="Department"
          value={department}
          onChange={setDepartment}
          placeholder="Select department..."
          options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
        />
      )}

      {errors.form && (
        <div className="rounded-lg border border-critical/20 bg-critical/5 px-3 py-2">
          <p className="text-xs text-critical dark:text-critical-light">{errors.form}</p>
        </div>
      )}

      <Button
        type="submit"
        loading={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
      >
        Already have an account? Log in
      </button>
    </form>
  );
}

/* ─── Login Form ─── */

function LoginForm({
  preselectedAccount,
  onClearPreselected,
}: {
  preselectedAccount?: RememberedAccount | null;
  onClearPreselected?: () => void;
}) {
  const { signIn, state } = useAuth();
  const [email, setEmail] = useState(preselectedAccount?.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const isSubmitting = state === 'loading';

  useEffect(() => {
    if (preselectedAccount) {
      setEmail(preselectedAccount.email);
      setErrors({});
    }
  }, [preselectedAccount]);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!password) {
      next.password = 'Password is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await signIn(email, password);
    if (!result.success) {
      setErrors({ form: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {preselectedAccount && (
        <PreselectedAccountBanner
          account={preselectedAccount}
          onClear={() => {
            onClearPreselected?.();
            setEmail('');
            setPassword('');
          }}
        />
      )}
      <Input
        label="Email"
        type="email"
        placeholder="you@gmail.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
        }}
        error={errors.email}
        iconLeft={<Mail className="h-4 w-4" />}
        autoComplete="email"
        disabled={!!preselectedAccount}
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
        }}
        error={errors.password}
        autoComplete="current-password"
      />

      {errors.form && (
        <div className="rounded-lg border border-critical/20 bg-critical/5 px-3 py-2">
          <p className="text-xs text-critical dark:text-critical-light">{errors.form}</p>
        </div>
      )}

      <Button
        type="submit"
        loading={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </Button>

    </form>
  );
}

/* ─── Main Login Page ─── */

export function LoginPage() {
  const { rememberedAccounts, removeRememberedAccount } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<RememberedAccount | null>(null);
  const [showOtherLogin, setShowOtherLogin] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const showReturningAccounts = mode === 'login' && rememberedAccounts.length > 0 && !selectedAccount && !showOtherLogin;

  const handleSelectAccount = (account: RememberedAccount) => {
    setSelectedAccount(account);
    setShowOtherLogin(false);
  };

  const handleUseOther = () => {
    setSelectedAccount(null);
    setShowOtherLogin(true);
  };

  const handleRemoveAccount = (email: string) => {
    removeRememberedAccount(email);
    if (selectedAccount?.email === email) {
      setSelectedAccount(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left brand panel */}
      <div className="flex flex-col justify-between bg-ink-900 text-white p-8 lg:p-12 lg:w-2/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-900 to-black opacity-90" />
        <div className="relative z-10 flex flex-col gap-8 flex-1 justify-center max-w-md">
          <div className="flex items-center gap-3">
        <img
          src="/assets/images/image.png"
          alt="ABBÉ"
          className="h-10 w-10 rounded-lg object-cover"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight">ABBÉ</span>
          <span className="text-xs text-ink-300">Lead Intelligence</span>
        </div>
      </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold leading-tight tracking-tight">
              Pre-CRM Lead Intelligence & Screening
            </h1>
            <p className="text-sm text-ink-300 leading-relaxed">
              Discover, screen, and qualify opportunities before they enter your
              CRM. FIT / PERSON / TIMING intelligence framework for disciplined
              pipeline quality.
            </p>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {[
              'Surface opportunities with market intelligence',
              'Screen with the FIT / PERSON / TIMING framework',
              'Assign, review, and nominate with audit trails',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-ink-200">
                <CheckCircle2 className="h-4 w-4 text-gold shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-ink-400 mt-8">
          New here? Use the sign up option to create your account.
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md flex flex-col gap-6">
          {mode === 'signup' ? (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Sign Up</span>
                </div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  Create your account
                </h2>
                <p className="text-sm text-muted-foreground">
                  Register to access the ABBÉ lead intelligence platform.
                </p>
              </div>
              <SignupForm onBack={() => setMode('login')} />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Log In</span>
                </div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  Welcome back
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials to access the ABBÉ platform.
                </p>
              </div>

              {showReturningAccounts ? (
                <ReturningAccounts
                  accounts={rememberedAccounts}
                  onSelect={handleSelectAccount}
                  onRemove={handleRemoveAccount}
                  onUseOther={handleUseOther}
                />
              ) : (
                <LoginForm
                  preselectedAccount={selectedAccount}
                  onClearPreselected={() => { setSelectedAccount(null); setShowOtherLogin(false); }}
                />
              )}

              <button
                type="button"
                onClick={() => { setMode('signup'); setSelectedAccount(null); setShowOtherLogin(false); }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Don't have an account? Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
