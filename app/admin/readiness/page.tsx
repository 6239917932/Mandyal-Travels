import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import {
  assessLaunchReadiness,
  launchReadinessEnvironmentKeys,
  type LaunchReadinessStatus,
} from '@/lib/operations/launchReadiness';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Launch readiness' };

const statusLabel: Record<LaunchReadinessStatus, string> = {
  ACTION_REQUIRED: 'Action required',
  EXTERNAL_APPROVAL: 'External approval',
  READY: 'Evidence present',
};

export default async function AdminReadinessPage() {
  const administrator = await getPlatformAdmin();
  if (!administrator) redirect('/login?returnTo=/admin/readiness');

  const [administratorMfa, completedJobs, verifiedSupplierCount] = await Promise.all([
    prisma.userMfaCredential.findFirst({
      select: { enabledAt: true },
      where: { enabledAt: { not: null }, userId: administrator.id },
    }),
    prisma.automationJobRun.findMany({
      distinct: ['jobKey'],
      select: { jobKey: true },
      where: { status: 'SUCCEEDED' },
    }),
    prisma.partnerApplication.count({
      where: { kycStatus: 'VERIFIED', partnerId: { not: null }, status: 'APPROVED' },
    }),
  ]);

  const environmentKeys = launchReadinessEnvironmentKeys();
  const gates = assessLaunchReadiness({
    administratorMfa: Boolean(administratorMfa?.enabledAt),
    completedAutomationJobs: new Set(completedJobs.map((job) => job.jobKey)),
    configuredEnvironmentKeys: new Set(
      environmentKeys.filter((key) => Boolean(process.env[key]?.trim())),
    ),
    verifiedSupplierCount,
  });
  const readyCount = gates.filter((gate) => gate.status === 'READY').length;
  const actionCount = gates.filter((gate) => gate.status === 'ACTION_REQUIRED').length;
  const externalCount = gates.filter((gate) => gate.status === 'EXTERNAL_APPROVAL').length;

  return (
    <section className="account-page platform-admin-page admin-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">Fail-closed production release register</p>
          <h1>Launch readiness</h1>
          <p>
            Review the next 20 technical, operational, commercial and supplier gates in one place.
            Configuration presence is evidence for review, not permission to activate a provider or
            public commerce.
          </p>
          <div className="admin-hero__actions">
            <Link className="ui-button ui-button--secondary" href="/admin/automation">
              Automation evidence
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin/configuration">
              Release controls
            </Link>
            <Link className="ui-button ui-button--secondary" href="/admin">
              Operations console
            </Link>
          </div>
        </div>
      </header>

      <div className="partner-bookings__summary">
        <Card className="admin-metric--clear">
          <span>Evidence present</span>
          <strong>{readyCount}</strong>
        </Card>
        <Card className={actionCount ? 'admin-metric--attention' : 'admin-metric--clear'}>
          <span>Internal action required</span>
          <strong>{actionCount}</strong>
        </Card>
        <Card>
          <span>External approvals</span>
          <strong>{externalCount}</strong>
        </Card>
        <Card>
          <span>Total controlled gates</span>
          <strong>{gates.length}</strong>
        </Card>
      </div>

      <Card className="business-report__table-card">
        <div className="business-report__table-scroll">
          <table className="business-report__table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Required outcome</th>
                <th>Runbook</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((gate, index) => (
                <tr key={gate.id}>
                  <td>
                    <strong>
                      {index + 1}. {gate.title}
                    </strong>
                    <span>{gate.category}</span>
                  </td>
                  <td>
                    <strong>{statusLabel[gate.status]}</strong>
                  </td>
                  <td>{gate.owner}</td>
                  <td>{gate.summary}</td>
                  <td>
                    <code>{gate.runbook}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
