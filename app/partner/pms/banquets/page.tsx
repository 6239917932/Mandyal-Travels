import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BanquetEventForm, BanquetTransitionControls } from '@/components/partner/BanquetControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerBanquetWorkspace } from '@/services/partnerBanquetService';

export const metadata: Metadata = { title: 'Groups and banquets | Mandyal PMS' };

type PageProps = { searchParams: Promise<{ property?: string | string[] }> };
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}

export default async function PartnerBanquetsPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerBanquetWorkspace({
    partnerId: access.partnerId,
    requestedPropertyId: firstValue(values.property),
  });
  const canManage = access.memberRole === 'ADMIN' && Boolean(access.userId);

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Events · controlled venue diary</p>
            <h1>Groups and banquets</h1>
            <p className="booking-page__intro">
              Record enquiries and quotations, place conflict-checked function-space holds, and
              preserve an immutable event lifecycle for each managed property.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms">
            PMS dashboard
          </Link>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Narrow the property selection or contact the platform
            administrator before recording more events.
          </p>
        ) : null}

        {workspace.selectedProperty ? (
          <>
            <Card>
              <form action="/partner/pms/banquets" className="supplier-form__grid" method="get">
                <label className="ui-field supplier-form__full-width">
                  <span className="ui-field__label">Managed property</span>
                  <select
                    className="ui-input"
                    defaultValue={workspace.selectedProperty.id}
                    name="property"
                  >
                    {workspace.properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ui-button ui-button--secondary" type="submit">
                  Open property
                </button>
              </form>
            </Card>
            <div className="partner-bookings__summary">
              <Card>
                <span>Business date</span>
                <strong>{workspace.businessDate}</strong>
              </Card>
              <Card>
                <span>Open enquiries</span>
                <strong>
                  {workspace.events.filter((event) => event.status === 'INQUIRY').length}
                </strong>
              </Card>
              <Card>
                <span>Venue holds</span>
                <strong>
                  {
                    workspace.events.filter((event) =>
                      ['PROVISIONAL', 'CONFIRMED'].includes(event.status),
                    ).length
                  }
                </strong>
              </Card>
            </div>
            {canManage ? (
              <Card>
                <p className="hotel-page__eyebrow">New event</p>
                <h2>Record a banquet enquiry</h2>
                <BanquetEventForm
                  businessDate={workspace.businessDate}
                  propertyId={workspace.selectedProperty.id}
                />
              </Card>
            ) : (
              <Card>
                <h2>Read-only event diary</h2>
                <p>A partner administrator must record quotations or change venue holds.</p>
              </Card>
            )}
            <Card>
              <p className="hotel-page__eyebrow">Function-space diary</p>
              <h2>{workspace.selectedProperty.name}</h2>
              {workspace.events.length ? (
                <ul className="pms-room-rack__queue-list">
                  {workspace.events.map((event) => (
                    <li key={event.id}>
                      <strong>
                        {event.eventDate} · {event.startTime}–{event.endTime} · {event.eventName}
                      </strong>
                      <span>
                        {event.venueName} · {event.eventType.replaceAll('_', ' ').toLowerCase()} ·{' '}
                        {event.expectedGuests} guests
                      </span>
                      <small>
                        {event.organizerName} · {money(event.quoteAmount, event.currency)} quoted ·{' '}
                        {event.status.toLowerCase()}
                      </small>
                      {event.requirements ? <small>{event.requirements}</small> : null}
                      {canManage ? (
                        <BanquetTransitionControls
                          eventId={event.id}
                          nextStatuses={event.nextStatuses}
                          version={event.version}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No banquet enquiries have been recorded for this property.</p>
              )}
            </Card>
            <Card>
              <p>
                This diary does not block guest rooms, collect deposits, issue tax invoices, post
                accounting revenue, or send customer messages. Those actions remain disabled until
                their governed workflows are connected.
              </p>
            </Card>
          </>
        ) : (
          <Card>
            <h2>No active managed hotel property</h2>
            <p>Add and activate a property before opening the banquet diary.</p>
            <Link className="ui-button ui-button--primary" href="/partner/properties">
              Open property settings
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}
