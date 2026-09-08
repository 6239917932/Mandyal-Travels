import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { guestRecognitionLabel } from '@/lib/pms/guestCrm';
import { getPartnerGuestCrmWorkspace } from '@/services/partnerGuestCrmService';

export const metadata: Metadata = { title: 'Guest CRM | Mandyal PMS' };

type PageProps = { searchParams: Promise<{ profile?: string | string[] }> };
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function PartnerGuestCrmPage({ searchParams }: PageProps) {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  const values = await searchParams;
  const workspace = await getPartnerGuestCrmWorkspace({
    partnerId: access.partnerId,
    requestedProfile: firstValue(values.profile),
  });

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Guest relationships · privacy minimized</p>
            <h1>Guest CRM</h1>
            <p className="booking-page__intro">
              Recognize returning guests from this partner&apos;s confirmed stays without creating a
              second customer database or exposing identity-document details.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms">
            PMS dashboard
          </Link>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Recent records remain available, but the complete guest
            population must be reviewed through a bounded export before operational use.
          </p>
        ) : null}

        <div className="partner-workspace__columns">
          <Card>
            <p className="hotel-page__eyebrow">Guest directory</p>
            <h2>{workspace.profiles.length} booking-derived profiles</h2>
            {workspace.profiles.length ? (
              <ul className="pms-room-rack__queue-list">
                {workspace.profiles.map((profile) => (
                  <li key={profile.selectionReference}>
                    <strong>{profile.guestName}</strong>
                    <span>
                      {profile.maskedEmail} · {profile.maskedPhone}
                    </span>
                    <small>
                      {guestRecognitionLabel(profile.recognition)} · {profile.stayCount} confirmed
                      stay{profile.stayCount === 1 ? '' : 's'}
                    </small>
                    <Link
                      className="home-card__link"
                      href={`/partner/pms/guest-crm?profile=${encodeURIComponent(profile.selectionReference)}`}
                    >
                      Open profile
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No confirmed guest stays exist for an active managed property.</p>
            )}
          </Card>

          <Card>
            <p className="hotel-page__eyebrow">Selected profile</p>
            {workspace.selectedProfile ? (
              <>
                <h2>{workspace.selectedProfile.guestName}</h2>
                <p>
                  {workspace.selectedProfile.maskedEmail} · {workspace.selectedProfile.maskedPhone}
                </p>
                <p>{guestRecognitionLabel(workspace.selectedProfile.recognition)}</p>
                <ul className="pms-room-rack__queue-list">
                  {workspace.selectedProfile.stays.map((stay) => (
                    <li key={stay.confirmationCode}>
                      <strong>
                        {stay.checkInDate} to {stay.checkOutDate} · {stay.hotelName}
                      </strong>
                      <span>
                        {stay.confirmationCode} ·{' '}
                        {stay.operationalStatus.replaceAll('_', ' ').toLowerCase()}
                      </span>
                      <small>
                        {stay.consentReferences} consent-backed guest registration reference
                        {stay.consentReferences === 1 ? '' : 's'}
                      </small>
                      {stay.specialRequest ? (
                        <small>
                          Stay request: {stay.specialRequest}. This is not carried to future stays
                          automatically.
                        </small>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {workspace.selectedProfile.staysTruncated ? (
                  <p>Only the most recent 20 stays are shown.</p>
                ) : null}
                <div className="manage-booking__document-actions">
                  <Link className="ui-button ui-button--secondary" href="/partner/bookings">
                    Open reservations
                  </Link>
                  <Link
                    className="ui-button ui-button--secondary"
                    href={`/partner/pms/guest-registration?booking=${encodeURIComponent(workspace.selectedProfile.selectionReference)}`}
                  >
                    Open guest register
                  </Link>
                </div>
              </>
            ) : (
              <p>Select a booking-derived guest profile after a confirmed stay is recorded.</p>
            )}
          </Card>
        </div>

        <Card>
          <p>
            This workspace is operational history, not marketing consent. It never exposes full
            identity references, never creates a separate guest identity, and never authorizes
            promotional messages. Marketing remains controlled by the customer consent centre.
          </p>
        </Card>
      </div>
    </main>
  );
}
