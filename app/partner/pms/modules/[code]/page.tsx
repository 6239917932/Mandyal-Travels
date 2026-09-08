import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPmsModule, pmsModules, type PmsModuleGroup } from '@/lib/pms/moduleRegistry';

type ModulePageProps = {
  params: Promise<{ code: string }>;
};

const relatedDestinations: Readonly<
  Record<PmsModuleGroup, readonly { href: string; label: string }[]>
> = {
  Overview: [
    { href: '/partner/pms', label: 'PMS dashboard' },
    { href: '/partner/reports', label: 'Performance reports' },
  ],
  'Front office and operations': [
    { href: '/partner/bookings', label: 'Reservations and front desk' },
    { href: '/partner/housekeeping', label: 'Housekeeping' },
  ],
  'Revenue and distribution': [
    { href: '/partner/inventory', label: 'Inventory and rates' },
    { href: '/partner/channels', label: 'Channel distribution' },
  ],
  'Finance and back office': [
    { href: '/partner/tax', label: 'Tax and billing' },
    { href: '/partner/settlements', label: 'Settlements' },
  ],
  'Guest and communication': [
    { href: '/partner/bookings', label: 'Guest reservations' },
    { href: '/partner/activity', label: 'Activity and access' },
  ],
  'Analytics and staff': [
    { href: '/partner/reports', label: 'Operational reports' },
    { href: '/partner/activity', label: 'Activity and access' },
  ],
  'System and administration': [
    { href: '/partner/properties', label: 'Property settings' },
    { href: '/partner/activity', label: 'Activity and access' },
  ],
};

const statusCopy = {
  FOUNDATION:
    'The shared data and access foundations exist, but this dedicated operating workflow is still being completed and verified.',
  PLANNED:
    'This module is registered in the approved PMS blueprint. Transactions remain unavailable until its persistence, permissions, audit trail and tests are complete.',
} as const;

export function generateStaticParams() {
  return pmsModules
    .filter((module) => !module.href)
    .map((module) => ({
      code: module.code.toLowerCase(),
    }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const pmsModule = getPmsModule((await params).code);
  return { title: pmsModule ? `${pmsModule.name} | Mandyal PMS` : 'PMS module' };
}

export default async function PmsModuleWorkspacePage({ params }: ModulePageProps) {
  const pmsModule = getPmsModule((await params).code);
  if (!pmsModule || pmsModule.href || pmsModule.status === 'LIVE') notFound();

  return (
    <section className="account-page partner-workspace pms-module-workspace">
      <header className="admin-hero">
        <div className="admin-hero__content">
          <p className="admin-hero__eyebrow">{pmsModule.group}</p>
          <h1>{pmsModule.name}</h1>
          <p>{pmsModule.description}</p>
        </div>
        <div className="admin-hero__posture">
          <span className="admin-hero__secure">Phase {pmsModule.phase}</span>
          <strong>
            {pmsModule.status === 'FOUNDATION' ? 'Foundation ready' : 'Blueprint registered'}
          </strong>
          <span>Property-scoped partner access is enforced.</span>
          <span>No unfinished transaction can be submitted from this workspace.</span>
        </div>
      </header>

      <div className="pms-control-centre__notice" role="status">
        <strong>
          {pmsModule.status === 'FOUNDATION' ? 'Controlled foundation' : 'Planned module'}
        </strong>
        <span>{statusCopy[pmsModule.status]}</span>
      </div>

      <div className="partner-workspace__columns pms-module-workspace__columns">
        <Card>
          <p className="hotel-page__eyebrow">Delivery gate</p>
          <h2>What must be complete before activation</h2>
          <ul className="pms-module-workspace__checklist">
            <li>Property-scoped records and server-side authorization</li>
            <li>Validated operational states and safe failure handling</li>
            <li>Immutable audit events for sensitive actions</li>
            <li>Automated domain, route and accessibility coverage</li>
          </ul>
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Available now</p>
          <h2>Continue in connected live areas</h2>
          <div className="pms-module-workspace__actions">
            {relatedDestinations[pmsModule.group].map((destination) => (
              <Link
                className="ui-button ui-button--secondary"
                href={destination.href}
                key={destination.href}
              >
                {destination.label}
              </Link>
            ))}
            <Link className="ui-button ui-button--primary" href="/partner/pms">
              Back to PMS dashboard
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}
