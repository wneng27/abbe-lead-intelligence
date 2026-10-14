import { Button } from '@/components/ui';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface FullScreenErrorProps {
  message?: string;
  onRetry: () => void;
}

export function FullScreenError({
  message = 'We could not load the application right now. Please try again in a moment.',
  onRetry,
}: FullScreenErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-critical/10 text-critical dark:text-critical-light">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
        <div className="mt-6">
          <Button onClick={onRetry} iconLeft={<RefreshCw className="h-4 w-4" />}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FullScreenLoading({ label = 'Loading ABBÉ...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="flex items-center gap-3">
        <img
          src="/assets/images/image.png"
          alt="ABBÉ"
          className="h-10 w-10 rounded-lg object-cover animate-pulse"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight text-foreground">
            ABBÉ
          </span>
          <span className="text-xs text-muted-foreground">Lead Intelligence</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <svg
          className="animate-spin h-4 w-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
