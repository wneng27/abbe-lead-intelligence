import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldX, Clock, ShieldOff } from 'lucide-react';
import { useAccess } from '@/lib/useAccess';
import type { AccessRecord } from '@/lib/navigation';

export interface AccessStatusBadgeProps {
  record: AccessRecord;
  className?: string;
}

export function AccessStatusBadge({ record, className }: AccessStatusBadgeProps) {
  const access = useAccess(record);

  if (access.isNotGranted) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5',
          className
        )}
        title="Access has not been granted by an administrator"
      >
        <ShieldOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold text-muted-foreground">
            No Access
          </span>
          <span className="text-2xs text-muted-foreground">Not granted</span>
        </div>
      </div>
    );
  }

  if (access.isExpired) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-critical/20 bg-critical/5 px-2.5 py-1.5',
          className
        )}
        title="Your system access has expired"
      >
        <ShieldX className="h-3.5 w-3.5 text-critical dark:text-critical-light shrink-0" />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold text-critical dark:text-critical-light">
            Access Expired
          </span>
          <span className="text-2xs text-muted-foreground">Contact administrator</span>
        </div>
      </div>
    );
  }

  const isWarning = access.isExpiringSoon;
  const timeLabel = access.timeRemaining;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
        isWarning
          ? 'border-risk/30 bg-risk/10'
          : 'border-border bg-secondary/60',
        className
      )}
      title={
        isWarning
          ? `Access expires soon — ${timeLabel} remaining`
          : `Access active — expires in ${timeLabel}`
      }
    >
      {isWarning ? (
        <ShieldAlert className="h-3.5 w-3.5 text-risk shrink-0" />
      ) : (
        <Shield className="h-3.5 w-3.5 text-success shrink-0" />
      )}
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            'text-xs font-semibold',
            isWarning ? 'text-risk' : 'text-foreground'
          )}
        >
          {isWarning ? 'Expiring Soon' : 'Access Active'}
        </span>
        <span className="flex items-center gap-1 text-2xs text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {isWarning ? `Expires in ${timeLabel}` : `Expires in ${timeLabel}`}
        </span>
      </div>
    </div>
  );
}
