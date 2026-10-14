import { PageHeader, Card, EmptyState, Breadcrumb } from '@/components/ui';
import { Construction } from 'lucide-react';
import type { Role } from '@/lib/navigation';

interface PlaceholderPageProps {
  title: string;
  description: string;
  breadcrumbs: string[];
  role: Role;
  primaryAction?: React.ReactNode;
}

const roleLabels: Record<Role, string> = {
  administrator: 'Administrator',
  sales_leader: 'Sales Department',
  account_manager: 'Account Manager',
};

export function PlaceholderPage({
  title,
  description,
  breadcrumbs,
  role,
  primaryAction,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumb={
          <Breadcrumb items={breadcrumbs.map((label) => ({ label }))} />
        }
        actions={primaryAction}
      />
      <Card>
        <EmptyState
          icon={
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Construction className="h-6 w-6" />
            </div>
          }
          title={title}
          description={`This page is not yet available. It will contain the ${title.toLowerCase()} functionality for the ${roleLabels[role]} workspace.`}
        />
      </Card>
    </div>
  );
}
