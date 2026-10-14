import { useState } from 'react';
import {
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Breadcrumb,
  SectionHeader,
  Tabs,
  type TabItem,
} from '@/components/ui';
import {
  Settings as SettingsIcon,
  Workflow,
  Info,
  Clock,
  Calendar,
  Globe,
  ArrowRight,
  ShieldCheck,
  FileText,
  RotateCw,
  Server,
  Database,
  Link2,
} from 'lucide-react';
import { INTELLIGENCE_FRAMEWORK } from '@/lib/tokens';

const TAB_ITEMS: TabItem[] = [
  { value: 'general', label: 'General' },
  { value: 'workflow', label: 'Workflow Rules' },
  { value: 'system', label: 'System Information' },
];

const GENERAL_SETTINGS = [
  { icon: <Globe className="h-4 w-4" />, label: 'System Name', value: 'ABBE Lead Intelligence' },
  { icon: <Clock className="h-4 w-4" />, label: 'Timezone', value: 'UTC−05:00 (Eastern Time)' },
  { icon: <Calendar className="h-4 w-4" />, label: 'Date Format', value: 'MMM D, YYYY' },
  { icon: <ArrowRight className="h-4 w-4" />, label: 'Default Landing Page', value: 'Dashboard' },
];

const WORKFLOW_RULES = [
  {
    icon: <Globe className="h-4 w-4" />,
    label: 'Opportunity Lifecycle',
    detail: 'Surfaced → Organized → Reviewed → Nominated',
  },
  {
    icon: <ArrowRight className="h-4 w-4" />,
    label: 'Assignment Behavior',
    detail: 'Only Sales Departments and Administrators can assign opportunities. Reassignment is permitted and recorded.',
  },
  {
    icon: <FileText className="h-4 w-4" />,
    label: 'Review Behavior',
    detail: 'Account Managers complete a structured review checklist before submission.',
  },
  {
    icon: <RotateCw className="h-4 w-4" />,
    label: 'Return-for-Review Behavior',
    detail: 'A reason from the predefined list is mandatory. Additional notes are optional.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    label: 'Nomination Workflow',
    detail: 'Reviewed opportunities are marked as Ready for Administrator Decision before CRM submission.',
  },
];

const SYSTEM_INFO = [
  { icon: <Info className="h-4 w-4" />, label: 'Application Version', value: 'v1.0.0 (preview)' },
  { icon: <Clock className="h-4 w-4" />, label: 'Build Date', value: 'September 2026' },
  { icon: <Database className="h-4 w-4" />, label: 'Database', value: 'Supabase (PostgreSQL)' },
  { icon: <Server className="h-4 w-4" />, label: 'Runtime', value: 'Vite + React + TypeScript' },
  { icon: <Link2 className="h-4 w-4" />, label: 'CRM Integration', value: 'Not configured' },
];

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="System configuration for the ABBE Lead Intelligence platform."
        breadcrumb={
          <Breadcrumb items={[{ label: 'Administrator' }, { label: 'Settings' }]} />
        }
      />

      <Tabs items={TAB_ITEMS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <SectionHeader
              title="General Configuration"
              description="Core system identity and display preferences."
              icon={<SettingsIcon className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {GENERAL_SETTINGS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                    {s.icon}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                </div>
                <span className="text-sm font-medium text-foreground bg-secondary/60 px-3 py-1.5 rounded-lg shrink-0">
                  {s.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 'workflow' && (
        <Card>
          <CardHeader>
            <SectionHeader
              title="Workflow Configuration"
              description="Rules governing the opportunity lifecycle, assignment, review, and nomination process."
              icon={<Workflow className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {WORKFLOW_RULES.map((rule) => (
              <div key={rule.label} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                  {rule.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{rule.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rule.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 'system' && (
        <Card>
          <CardHeader>
            <SectionHeader
              title="System Details"
              description="Application version, runtime stack, and integration status."
              icon={<Server className="h-4 w-4" />}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {SYSTEM_INFO.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                    {row.icon}
                  </span>
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                </div>
                <span className="text-sm font-medium text-foreground shrink-0">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
