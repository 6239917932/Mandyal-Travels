import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { getCurrentUser } from '@/lib/auth/session';
import { agentWorkspaceNavigation } from '@/lib/navigation/workspaceNavigation';

export default async function AgentLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/agent');

  return (
    <WorkspaceShell
      groups={agentWorkspaceNavigation}
      identity={user.email}
      subtitle="Agency operations"
      title="Mandyal Agent"
    >
      {children}
    </WorkspaceShell>
  );
}
