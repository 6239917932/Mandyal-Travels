import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { NightAuditCloseForm } from '@/components/partner/NightAuditCloseForm';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerNightAuditWorkspace } from '@/services/partnerNightAuditService';

export const metadata: Metadata = { title: 'Night audit | Mandyal PMS' };

type NightAuditPageProps = {
  searchParams: Promise<{ property?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function checklistItem(label: string, count: number, clearText: string) {
  return (
    <li key={label}>
      <strong>{count === 0 ? `Clear · ${label}` : `${count} · ${label}`}</strong>
      <span>{count === 0 ? clearText : 'Resolve before closing the operational date.'}</span>
    </li>
  );
}

export default async function PartnerNightAuditPage({ searchParams }: NightAuditPageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerNightAuditWorkspace(
    access.partnerId,
    firstValue(values.property),
  );
  const selected = workspace.selectedProperty;
  const snapshot = workspace.snapshot;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Operations · immutable date control</p>
            <h1>Night audit</h1>
            <p className="booking-page__intro">
              Review the property close checklist, preserve an immutable snapshot, and advance one
              authoritative operational date for front desk, rooms, housekeeping and cashiering.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/pms/billing">
              Open Billing
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              PMS dashboard
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Property display safety limit reached. Contact the platform administrator before close.
          </p>
        ) : null}

        {selected && snapshot && workspace.operationalDate && workspace.calendarDate ? (
          <>
            <Card>
              <form action="/partner/pms/night-audit" className="supplier-form__grid" method="get">
                <label className="ui-field supplier-form__full-width">
                  <span className="ui-field__label">Managed property</span>
                  <select className="ui-input" defaultValue={selected.id} name="property">
                    {workspace.properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} · operational date {property.operationalDate}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ui-button ui-button--secondary" type="submit">
                  Review property
                </button>
              </form>
            </Card>

            <div className="partner-bookings__summary">
              <Card>
                <span>Operational date</span>
                <strong>{workspace.operationalDate}</strong>
                <small>Local calendar date {workspace.calendarDate}</small>
              </Card>
              <Card>
                <span>Blocking items</span>
                <strong>{snapshot.blockerCount}</strong>
                <small>
                  {snapshot.blockerCount === 0 ? 'Ready for controlled close' : 'Action required'}
                </small>
              </Card>
              <Card>
                <span>Occupied stays</span>
                <strong>{snapshot.counts.occupiedRooms}</strong>
                <small>{snapshot.counts.totalRooms} physical rooms</small>
              </Card>
              <Card>
                <span>Rooms carried forward</span>
                <strong>{snapshot.counts.dirtyRooms + snapshot.counts.outOfServiceRooms}</strong>
                <small>{snapshot.counts.activeMaintenance} active maintenance orders</small>
              </Card>
            </div>

            <Card>
              <p className="hotel-page__eyebrow">Mandatory close checklist</p>
              <h2>{selected.name}</h2>
              <ul className="pms-room-rack__queue-list">
                {checklistItem(
                  'unfinished POS and kitchen orders',
                  snapshot.blockers.activePosOrders,
                  'Every order is posted to its guest folio or cancelled.',
                )}
                {checklistItem(
                  'open cashier shifts',
                  snapshot.blockers.openCashierShifts,
                  'Every shift is reconciled and closed.',
                )}
                {checklistItem(
                  'unresolved arrivals',
                  snapshot.blockers.unresolvedArrivals,
                  'No arrival due on or before this date remains reserved.',
                )}
                {checklistItem(
                  'overdue departures',
                  snapshot.blockers.overdueDepartures,
                  'No departure due on or before this date remains checked in.',
                )}
                {checklistItem(
                  'pending amendments',
                  snapshot.blockers.pendingAmendments,
                  'All booking date changes are reviewed.',
                )}
                {checklistItem(
                  'urgent maintenance orders',
                  snapshot.blockers.urgentMaintenance,
                  'No urgent room issue is unresolved.',
                )}
              </ul>
            </Card>

            <Card>
              <p className="hotel-page__eyebrow">Controlled close</p>
              <h2>Advance to the next operational date</h2>
              <p>
                Dirty rooms, out-of-service rooms and non-urgent maintenance remain visible after
                close. The close record and its readiness snapshot are append-only.
              </p>
              {access.memberRole !== 'ADMIN' ? (
                <p>Only a hotel partner administrator can perform the final close.</p>
              ) : snapshot.blockerCount > 0 ? (
                <p className="booking-page__payment-error" role="alert">
                  Resolve all blocking items and refresh this page before closing.
                </p>
              ) : !workspace.canCloseToday ? (
                <p className="booking-page__payment-error" role="alert">
                  This operational date is ahead of the property calendar and cannot be closed yet.
                </p>
              ) : (
                <NightAuditCloseForm
                  businessDate={workspace.operationalDate}
                  propertyId={selected.id}
                  version={workspace.version}
                />
              )}
            </Card>

            <Card>
              <p className="hotel-page__eyebrow">Immutable close history</p>
              <h2>Recent operational dates</h2>
              {workspace.history.length ? (
                <ul className="pms-room-rack__queue-list">
                  {workspace.history.map((entry) => (
                    <li key={entry.businessDate}>
                      <strong>
                        {entry.businessDate} → {entry.nextBusinessDate}
                      </strong>
                      <span>{entry.closeNote}</span>
                      <small>Closed {new Date(entry.closedAt).toLocaleString('en-IN')}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No operational dates have been closed for this property yet.</p>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a managed hotel property before running Night Audit.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
