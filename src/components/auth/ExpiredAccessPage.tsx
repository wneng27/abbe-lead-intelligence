import { Button } from '@/components/ui';
import { ShieldX, Clock, LogOut, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DEFAULT_ACCESS_DURATION_HOURS } from '@/lib/navigation';

interface ExpiredAccessPageProps {
  onRestore?: () => void;
}

export function ExpiredAccessPage({ onRestore }: ExpiredAccessPageProps) {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-critical/10 text-critical dark:text-critical-light">
          <ShieldX className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Your system access has expired
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your access period has ended. Please contact an Administrator
            to request access again.
          </p>
        </div>

        <div className="mt-6 w-full rounded-xl border border-border bg-secondary/40 p-4 flex flex-col gap-2 text-left">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Access period: {DEFAULT_ACCESS_DURATION_HOURS} hours from grant time</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="outline"
            iconLeft={<LogOut className="h-4 w-4" />}
            onClick={signOut}
          >
            Return to Log In
          </Button>
        </div>

        {onRestore && (
          <p className="mt-6 text-2xs text-muted-foreground/60">
            An administrator can grant a new access period.
          </p>
        )}

        {user && (
          <p className="mt-4 text-2xs text-muted-foreground">
            Signed in as {user.name}
          </p>
        )}
      </div>
    </div>
  );
}
