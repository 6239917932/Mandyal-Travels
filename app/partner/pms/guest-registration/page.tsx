import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GuestRegistrationForm } from '@/components/partner/GuestRegistrationForm';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerGuestRegistrationWorkspace } from '@/services/partnerGuestRegistrationService';

export const metadata: Metadata = { title: 'Guest registration | Mandyal PMS' };

type GuestRegistrationPageProps = {
  searchParams: Promise<{ booking?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function documentLabel(value: string): string {
  return value.replace('_LAST4', '').replaceAll('_', ' ').toLowerCase();
}

export default async function PartnerPmsGuestRegistrationPage({
  searchParams,
}: GuestRegistrationPageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerGuestRegistrationWorkspace(
    access.partnerId,
    firstValue(values.booking),
  );

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Front office · data minimization</p>
            <h1>Guest registration</h1>
            <p className="booking-page__intro">
              Record a verified, masked document reference for an active stay without retaining the
              full identity number or a document image.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--secondary" href="/partner/bookings">
              Open Front desk
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/pms/room-rack">
              Open Room rack
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Narrow the active stay list or contact the platform
            administrator before recording more entries.
          </p>
        ) : null}

        {workspace.stays.length ? (
          <Card>
            <form
              action="/partner/pms/guest-registration"
              className="supplier-form__grid"
              method="get"
            >
              <label className="ui-field supplier-form__full-width">
                <span className="ui-field__label">Active reservation or in-house stay</span>
                <select
                  className="ui-input"
                  defaultValue={workspace.selectedStay?.confirmationCode}
                  name="booking"
                >
                  {workspace.stays.map((stay) => (
                    <option key={stay.confirmationCode} value={stay.confirmationCode}>
                      {stay.confirmationCode} · {stay.guestName} · {stay.hotelName}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ui-button ui-button--secondary" type="submit">
                Open guest register
              </button>
            </form>
          </Card>
        ) : (
          <Card>
            <h2>No active hotel stays</h2>
            <p>Create or confirm a reservation before recording a guest document reference.</p>
            <Link className="ui-button ui-button--primary" href="/partner/pms/walk-in">
              Create walk-in booking
            </Link>
          </Card>
        )}

        {workspace.selectedStay ? (
          <div className="partner-workspace__columns">
            <Card>
              <p className="hotel-page__eyebrow">Selected stay</p>
              <h2>{workspace.selectedStay.guestName}</h2>
              <p>
                {workspace.selectedStay.confirmationCode} · {workspace.selectedStay.hotelName}
              </p>
              <p>
                {workspace.selectedStay.checkInDate} to {workspace.selectedStay.checkOutDate} ·{' '}
                {workspace.selectedStay.rooms} room
                {workspace.selectedStay.rooms === 1 ? '' : 's'} ·{' '}
                {workspace.selectedStay.operationalStatus.replaceAll('_', ' ').toLowerCase()}
              </p>
              <GuestRegistrationForm
                confirmationCode={workspace.selectedStay.confirmationCode}
                defaultGuestName={workspace.selectedStay.guestName}
              />
            </Card>
            <Card>
              <p className="hotel-page__eyebrow">Verified references</p>
              <h2>{workspace.selectedStay.registrations.length} guests recorded</h2>
              {workspace.selectedStay.registrations.length ? (
                <ul className="pms-room-rack__queue-list">
                  {workspace.selectedStay.registrations.map((registration) => (
                    <li key={`${registration.guestName}-${registration.createdAt}`}>
                      <strong>{registration.guestName}</strong>
                      <span>
                        {documentLabel(registration.identityType)} {registration.identityReference}
                      </span>
                      <small>
                        {registration.nationalityCountryCode} · {registration.residenceCity} ·{' '}
                        {registration.verificationStatus.replaceAll('_', ' ').toLowerCase()}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No guest references have been recorded for this stay.</p>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
