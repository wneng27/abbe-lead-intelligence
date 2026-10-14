import { useState, useEffect, useMemo } from 'react';
import {
  type AccessRecord,
  type AccessState,
  computeAccessState,
  formatTimeRemaining,
} from '@/lib/navigation';

export interface AccessInfo {
  record: AccessRecord;
  state: AccessState;
  timeRemaining: string;
  isExpired: boolean;
  isActive: boolean;
  isExpiringSoon: boolean;
  isNotGranted: boolean;
  expiresAt: number | null;
}

export function useAccess(record: AccessRecord, intervalMs: number = 30000): AccessInfo {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return useMemo(() => {
    const expiresAt = record.access_expires_at;
    const state = computeAccessState(expiresAt, now);
    return {
      record,
      state,
      timeRemaining: formatTimeRemaining(expiresAt, now),
      isExpired: state === 'expired',
      isActive: state === 'active',
      isExpiringSoon: state === 'expiring_soon',
      isNotGranted: state === 'not_granted',
      expiresAt,
    };
  }, [record, now]);
}
