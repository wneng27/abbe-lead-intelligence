import React from 'react';
import { cn } from '@/lib/utils';

const avatarColors = [
  'bg-gold text-ink-900',
  'bg-ink-600 text-white',
  'bg-ink-400 text-white',
  'bg-success text-white',
  'bg-risk text-white',
  'bg-ink-500 text-white',
  'bg-ink-300 text-ink-800 dark:text-ink-200',
  'bg-ink-700 text-white',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const avatarSizes = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof avatarSizes;
  className?: string;
}

export const Avatar = ({ name, src, size = 'md', className }: AvatarProps) => {
  const [imgError, setImgError] = React.useState(false);
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium shrink-0 overflow-hidden',
        avatarSizes[size],
        !src || imgError ? getColorForName(name) : '',
        className
      )}
      role="img"
      aria-label={name}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
};

export interface AvatarGroupProps {
  people: { name: string; src?: string }[];
  size?: keyof typeof avatarSizes;
  max?: number;
  className?: string;
}

export const AvatarGroup = ({ people, size = 'sm', max = 4, className }: AvatarGroupProps) => {
  const visible = people.slice(0, max);
  const overflow = people.length - max;

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-2">
        {visible.map((person, i) => (
          <span
            key={i}
            className={cn(
              'ring-2 ring-background rounded-full',
              'dark:ring-card'
            )}
          >
            <Avatar name={person.name} src={person.src} size={size} />
          </span>
        ))}
        {overflow > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full font-medium ring-2 ring-background dark:ring-card',
              avatarSizes[size],
              'bg-secondary text-foreground border border-border'
            )}
          >
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
};
