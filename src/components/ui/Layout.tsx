import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X, Search, Sun, Moon, ChevronDown } from 'lucide-react';
import { IconButton, Button } from './Button';
import { Avatar } from './Avatar';
import { DropdownMenu } from './Overlays';

/* ─── Sidebar ─── */

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  children?: { label: string; active?: boolean; onClick?: () => void }[];
}

export interface SidebarProps {
  navItems: NavItem[];
  logo?: React.ReactNode;
  footer?: React.ReactNode;
  collapsed?: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export const Sidebar = ({ navItems, logo, footer, onNavigate, className }: SidebarProps) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        className
      )}
    >
      {/* Logo area */}
      <div className="flex items-center h-16 px-5 border-b border-sidebar-border shrink-0">
        {logo}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item, i) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItem === item.label;
            return (
              <div key={i}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      setExpandedItem(isExpanded ? null : item.label);
                    }
                    item.onClick?.();
                    onNavigate?.();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    item.active
                      ? 'bg-gold/15 text-gold'
                      : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover'
                  )}
                >
                  <span className={cn('shrink-0', item.active ? 'text-gold' : 'text-sidebar-muted')}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center rounded-full text-2xs font-semibold px-1.5 h-4 min-w-4',
                        item.active
                          ? 'bg-gold text-ink-900'
                          : 'bg-sidebar-hover text-sidebar-foreground'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  {hasChildren && (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 text-sidebar-muted transition-transform shrink-0',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  )}
                </button>
                {hasChildren && isExpanded && (
                  <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                    {item.children!.map((child, j) => (
                      <button
                        key={j}
                        onClick={() => {
                          child.onClick?.();
                          onNavigate?.();
                        }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                          child.active
                            ? 'text-gold'
                            : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover'
                        )}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {footer && (
        <div className="px-3 py-3 border-t border-sidebar-border shrink-0">{footer}</div>
      )}
    </aside>
  );
};

/* ─── Header ─── */

export interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  actions?: React.ReactNode;
  user?: { name: string; email: string; avatar?: string; roleLabel?: string; department?: string };
  onToggleTheme?: () => void;
  isDark?: boolean;
  onSignOut?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export const Header = ({
  title,
  onMenuClick,
  searchPlaceholder = 'Search...',
  onSearch,
  actions,
  user,
  onToggleTheme,
  isDark = false,
  onSignOut,
  onSettingsClick,
  className,
}: HeaderProps) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 h-16 px-4 lg:px-6 bg-card border-b border-border shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onMenuClick && (
          <IconButton
            label="Toggle menu"
            onClick={onMenuClick}
            className="lg:hidden"
            size="icon-sm"
          >
            <Menu className="h-5 w-5" />
          </IconButton>
        )}
        {title && (
          <h2 className="text-sm font-semibold text-foreground truncate hidden sm:block">
            {title}
          </h2>
        )}
        {onSearch && (
          <>
          <div className="relative hidden md:block ml-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <label htmlFor="header-search" className="sr-only">Search</label>
            <input
              id="header-search"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-48 lg:w-64 h-9 rounded-lg border border-input bg-secondary/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background focus:w-56 lg:focus:w-72 transition-all"
            />
          </div>
          <div className="relative md:hidden ml-2 flex-1 max-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <label htmlFor="header-search-mobile" className="sr-only">Search</label>
            <input
              id="header-search-mobile"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full h-9 rounded-lg border border-input bg-secondary/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent focus:bg-background"
            />
          </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {actions}
        {onToggleTheme && (
          <IconButton label="Toggle theme" onClick={onToggleTheme} size="icon-sm">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
        )}

        {user && (
          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-foreground">{user.name}</span>
                  <span className="text-2xs text-muted-foreground">
                    {user.roleLabel ?? user.email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>
            }
            items={[
              { label: 'Profile', onClick: () => onSettingsClick?.() },
              ...(user.department ? [{ label: user.department, onClick: () => {}, disabled: true }] : []),
              { label: 'Settings', onClick: () => onSettingsClick?.() },
              { label: '', separator: true },
              { label: 'Sign out', onClick: () => onSignOut?.(), destructive: true },
            ]}
          />
        )}
      </div>
    </header>
  );
};

/* ─── App Shell ─── */

export interface AppShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const AppShell = ({
  sidebar,
  header,
  children,
  maxWidth = 'max-w-7xl',
  className,
}: AppShellProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        {React.isValidElement(sidebar)
          ? React.cloneElement(sidebar as React.ReactElement<SidebarProps>, {
              onNavigate: () => setSidebarOpen(false),
            })
          : sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 animate-slide-in-right">
            {React.isValidElement(sidebar)
              ? React.cloneElement(sidebar as React.ReactElement<SidebarProps>, {
                  onNavigate: () => setSidebarOpen(false),
                })
              : sidebar}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {React.isValidElement(header)
          ? React.cloneElement(header as React.ReactElement<HeaderProps>, {
              onMenuClick: () => setSidebarOpen(true),
            })
          : header}
        <main className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto px-4 lg:px-6 py-6', maxWidth, className)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

/* ─── Page Container ─── */

export const PageContainer = ({
  children,
  className,
  maxWidth = 'max-w-7xl',
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) => (
  <div className={cn('mx-auto px-4 lg:px-6 py-6', maxWidth, className)}>{children}</div>
);
