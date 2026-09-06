import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { getCurrentUser } from '@/lib/auth/session';
import { customerWorkspaceNavigation } from '@/lib/navigation/workspaceNavigation';

export default async function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/account');

  return (
    <WorkspaceShell
      groups={customerWorkspaceNavigation}
      identity={user.email}
      subtitle="Travel account"
      title="My Mandyal"
    >
      {children}
    </WorkspaceShell>
  );
}
