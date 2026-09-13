import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LostFoundEventForm, LostFoundItemForm } from '@/components/partner/LostFoundControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { calendarDateInTimezone } from '@/lib/pms/operationalDate';
import { getPartnerLostFoundWorkspace } from '@/services/partnerLostFoundService';

export const metadata: Metadata = { title: 'Lost and found | Mandyal PMS' };

export default async function PartnerLostFoundPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || !access.userId || access.partnerType !== 'HOTEL') redirect('/partner');
  const workspace = await getPartnerLostFoundWorkspace(access.partnerId);
  const openItems = workspace.items.filter((item) =>
    ['IN_CUSTODY', 'MATCHED'].includes(item.status),
  );
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Housekeeping · controlled custody</p>
            <h1>Lost and found</h1>
            <p className="booking-page__intro">
              Register found property, track secure custody, and preserve release or disposal
              evidence without storing identity-document numbers.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/housekeeping">
            Housekeeping
          </Link>
        </header>
        <div className="partner-bookings__summary">
          <Card>
            <span>In custody</span>
            <strong>{workspace.items.filter((item) => item.status === 'IN_CUSTODY').length}</strong>
          </Card>
          <Card>
            <span>Potentially matched</span>
            <strong>{workspace.items.filter((item) => item.status === 'MATCHED').length}</strong>
          </Card>
          <Card>
            <span>Returned</span>
            <strong>{workspace.items.filter((item) => item.status === 'RETURNED').length}</strong>
          </Card>
          <Card>
            <span>History events</span>
            <strong>{workspace.events.length}</strong>
          </Card>
        </div>
        {workspace.safetyLimitReached ? (
          <Card>
            <p>
              Safety limit reached. Export or archive reviewed records before adding more
              operational history.
            </p>
          </Card>
        ) : null}
        <Card>
          <p className="hotel-page__eyebrow">New custody record</p>
          <h2>Register a found item</h2>
          <LostFoundItemForm
            maximumFoundDate={calendarDateInTimezone('Asia/Kolkata')}
            properties={workspace.properties.map((property) => ({
              id: property.id,
              name: property.displayName,
            }))}
          />
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Custody decision</p>
          <h2>Match, return, or authorize disposal</h2>
          <LostFoundEventForm
            canDispose={access.memberRole === 'ADMIN'}
            items={openItems.map((item) => ({
              id: item.id,
              label: `${item.property.displayName} · ${item.referenceCode} · ${item.itemName}`,
              status: item.status,
              version: item.version,
            }))}
          />
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Current register</p>
          <h2>Found-property custody</h2>
          {workspace.items.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Item</th>
                    <th scope="col">Found</th>
                    <th scope="col">Storage</th>
                    <th scope="col">Reservation</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.property.displayName}</td>
                      <td>{item.referenceCode}</td>
                      <th scope="row">
                        {item.itemName}
                        <small>{item.description}</small>
                      </th>
                      <td>
                        {item.foundOn}
                        <small>
                          {item.foundLocation} · {item.foundBy}
                        </small>
                      </td>
                      <td>{item.storageLocation}</td>
                      <td>{item.reservationReference || 'Not linked'}</td>
                      <td>{item.status.toLowerCase().replaceAll('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No found property has been registered.</p>
          )}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Immutable history</p>
          <h2>Recent custody events</h2>
          {workspace.events.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.property.displayName} · {event.item.referenceCode} ·{' '}
                    {event.action.toLowerCase().replaceAll('_', ' ')}
                  </strong>
                  <span>{event.note}</span>
                  <small>
                    {event.releasedTo ? `Released to ${event.releasedTo} · ` : ''}
                    {event.releaseEvidenceReference
                      ? `Evidence ${event.releaseEvidenceReference} · `
                      : ''}
                    {event.createdAt.toLocaleString('en-IN')}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No custody events have been recorded.</p>
          )}
        </Card>
        <Card>
          <p>
            Verify a claimant against the hotel&apos;s approved process before release. Record only
            a bounded internal evidence reference here; do not enter Aadhaar, passport, card, bank,
            PIN, OTP, or full identity-document numbers.
          </p>
        </Card>
      </div>
    </main>
  );
}
