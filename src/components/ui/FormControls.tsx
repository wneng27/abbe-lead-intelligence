import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X, Search, Calendar } from 'lucide-react';

/* ─── Input ─── */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, hint, iconLeft, iconRight, wrapperClassName, id, ...props },
    ref
  ) => {
    const inputId = id || props.name;
    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              iconLeft && 'pl-9',
              iconRight && 'pr-9',
              error
                ? 'border-critical/40 focus:ring-critical/30'
                : 'border-input hover:border-muted-foreground/30',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {iconRight}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-critical dark:text-critical-light">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ─── Search Input ─── */

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, label, value, onClear, id, ...props }, ref) => {
    const inputId = id || 'search-input';
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={ref}
            id={inputId}
            type="search"
            value={value}
            className={cn(
              'w-full h-10 rounded-lg border border-input bg-secondary/50 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background',
              className
            )}
            {...props}
          />
          {value && onClear && (
            <button
              onClick={onClear}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

/* ─── Select ─── */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export const Select = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  error,
  hint,
  className,
  disabled,
  id,
  ariaLabel,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const selectId = id || `select-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) { setActiveIndex(-1); return; }
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) { onChange?.(opt.value); setOpen(false); }
    }
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full h-10 rounded-lg border bg-background px-3 text-sm text-left flex items-center justify-between gap-2 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-critical/40 focus:ring-critical/30'
              : 'border-input hover:border-muted-foreground/30',
            open && 'ring-2 ring-ring border-transparent',
            !selected && 'text-muted-foreground/70'
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel || label}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 max-h-60 overflow-auto animate-slide-in-up" role="listbox">
            {options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors',
                  'hover:bg-secondary active:bg-secondary disabled:opacity-40 disabled:pointer-events-none',
                  opt.value === value && 'font-medium',
                  i === activeIndex && 'bg-secondary'
                )}
                role="option"
                aria-selected={opt.value === value}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <Check className="h-4 w-4 text-gold shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-critical dark:text-critical-light">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};
Select.displayName = 'Select';

/* ─── Multi-Select ─── */

export interface MultiSelectProps {
  options: SelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const MultiSelect = ({
  options,
  value = [],
  onChange,
  label,
  placeholder = 'Select...',
  className,
  disabled,
  id,
}: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const msId = id || `multiselect-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedOptions = options.filter((o) => value.includes(o.value));

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange?.(value.filter((v) => v !== val));
    } else {
      onChange?.([...value, val]);
    }
  };

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== val));
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={msId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div ref={ref} className="relative">
        <button
          id={msId}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full min-h-10 rounded-lg border bg-background px-3 text-sm text-left flex items-center gap-1.5 flex-wrap py-1.5 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            open ? 'ring-2 ring-ring border-transparent' : 'border-input hover:border-muted-foreground/30'
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label || placeholder}
        >
          {selectedOptions.length === 0 && (
            <span className="text-muted-foreground/70">{placeholder}</span>
          )}
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
            >
              {opt.label}
              <button
                onClick={(e) => remove(opt.value, e)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${opt.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground shrink-0 ml-auto transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 max-h-60 overflow-auto animate-slide-in-up">
            {options.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors',
                    'hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border transition-colors shrink-0',
                      isSelected
                        ? 'bg-gold border-gold text-ink-900'
                        : 'border-input'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
MultiSelect.displayName = 'MultiSelect';

/* ─── Checkbox ─── */

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  indeterminate?: boolean;
}

export const Checkbox = ({
  checked = false,
  onChange,
  label,
  description,
  disabled,
  className,
  indeterminate,
}: CheckboxProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  return (
    <label
      className={cn(
        'inline-flex items-start gap-2.5 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span className="relative flex items-center mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="peer sr-only"
          ref={(el) => {
            if (el) el.indeterminate = !!indeterminate;
          }}
        />
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded border transition-all duration-150',
            'border-input peer-hover:border-muted-foreground/40',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background',
            (checked || indeterminate) && 'bg-gold border-gold'
          )}
        >
          {indeterminate ? (
            <span className="h-0.5 w-2 bg-ink-900 rounded-sm" />
          ) : checked ? (
            <Check className="h-3 w-3 text-ink-900" />
          ) : null}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-foreground leading-tight">{label}</span>}
          {description && (
            <span className="text-xs text-muted-foreground leading-tight">{description}</span>
          )}
        </span>
      )}
    </label>
  );
};
Checkbox.displayName = 'Checkbox';

/* ─── Radio ─── */

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export const RadioGroup = ({
  options,
  value,
  onChange,
  label,
  direction = 'vertical',
  className,
}: RadioGroupProps) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      <div
        className={cn(
          'flex gap-4',
          direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
        role="radiogroup"
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <label
              key={opt.value}
              className={cn(
                'inline-flex items-start gap-2.5 cursor-pointer select-none',
                opt.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="relative flex items-center mt-0.5">
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => onChange?.(opt.value)}
                  disabled={opt.disabled}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all duration-150',
                    'border-input peer-hover:border-muted-foreground/40',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background',
                    isSelected && 'border-gold'
                  )}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground leading-tight">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs text-muted-foreground leading-tight">
                    {opt.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
RadioGroup.displayName = 'RadioGroup';

/* ─── Switch ─── */

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = ({
  checked = false,
  onChange,
  label,
  description,
  disabled,
  className,
}: SwitchProps) => {
  return (
    <label
      className={cn(
        'inline-flex items-start gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span className="relative inline-flex items-center mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          className={cn(
            'block h-5 w-9 rounded-full transition-colors duration-200',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background',
            checked ? 'bg-gold' : 'bg-border'
          )}
        >
          <span
            className={cn(
              'block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5',
              checked ? 'translate-x-[18px]' : 'translate-x-0.5'
            )}
          />
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-foreground leading-tight">{label}</span>}
          {description && (
            <span className="text-xs text-muted-foreground leading-tight">{description}</span>
          )}
        </span>
      )}
    </label>
  );
};
Switch.displayName = 'Switch';

/* ─── Date Selector ─── */

export interface DateSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const DateSelector = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  hint,
  className,
  disabled,
  id,
}: DateSelectorProps) => {
  const dateId = id || `date-${Math.random().toString(36).slice(2)}`;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={dateId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          id={dateId}
          type="date"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-critical/40 focus:ring-critical/30'
              : 'border-input hover:border-muted-foreground/30'
          )}
          aria-invalid={!!error}
        />
      </div>
      {error ? (
        <p className="text-xs text-critical dark:text-critical-light">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};
DateSelector.displayName = 'DateSelector';
