import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PartnerBusOperations } from '@/components/partner/PartnerBusOperations';
import { getPartnerAccess } from '@/lib/partnerAuth';
export const metadata: Metadata = { title: 'Bus route and trip operations' };
export default async function PartnerBusOperationsPage() {
  const access = await getPartnerAccess();
  if (!access) redirect('/login?returnTo=/partner/bus-operations');
  if (access.partnerType !== 'BUS') redirect('/partner');
  return <section className="account-page"><div className="partner-page__heading"><div><p className="hotel-page__eyebrow">Bus operator operations</p><h1>Routes, schedules, seats, and fares</h1><p>Create governed route definitions and dated services before distributing them to customer search.</p></div><div className="manage-booking__document-actions"><Link className="ui-button ui-button--secondary" href="/partner/bus-bookings">Passenger manifest</Link><Link className="ui-button ui-button--secondary" href="/buses">Live bus search</Link></div></div><PartnerBusOperations canCreateRoutes={access.memberRole === 'ADMIN'} /></section>;
}
