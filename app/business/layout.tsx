import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { getCurrentUser } from '@/lib/auth/session';
import { businessWorkspaceNavigation } from '@/lib/navigation/workspaceNavigation';

export default async function BusinessLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <WorkspaceShell
      groups={businessWorkspaceNavigation}
      identity={user?.email ?? ''}
      publicPaths={['/business']}
      subtitle="Corporate travel"
      title="Mandyal Business"
    >
      {children}
    </WorkspaceShell>
  );
}
