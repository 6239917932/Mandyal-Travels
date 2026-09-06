import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { adminWorkspaceNavigation } from '@/lib/navigation/workspaceNavigation';

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin');

  return (
    <WorkspaceShell
      groups={adminWorkspaceNavigation}
      identity={administrator.email}
      subtitle="Operations control"
      title="Mandyal Admin"
    >
      {children}
    </WorkspaceShell>
  );
}
