import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AdminPartnerPropertyAssignment } from '@/components/admin/AdminPartnerPropertyAssignment';
import { AdminPropertyReviewActions } from '@/components/admin/AdminPropertyReviewActions';
import { AdminPartnerKycReview } from '@/components/admin/AdminPartnerKycReview';
import { Card } from '@/components/ui/Card';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { inventorySourceLabel } from '@/lib/inventory/sourceLabels';
import { prisma } from '@/lib/prisma';
import { hotelService } from '@/services/hotelService';

export const metadata: Metadata = { title: 'Supplier record' };
type Props = { params: Promise<{ partnerId: string }> };
export default async function AdminPartnerRecordPage({ params }: Props) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/partners');
  const { partnerId } = await params;
  const [partner, hotels] = await Promise.all([
    prisma.supplyPartner.findUnique({
      include: {
        applications: { orderBy: { createdAt: 'desc' } },
        kycDocuments: {
          include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
          orderBy: { documentType: 'asc' },
        },
        auditEntries: {
          include: { actor: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        members: {
          include: { user: { select: { email: true, firstName: true, lastName: true } } },
        },
        properties: {
          include: { rooms: { where: { status: 'ACTIVE' } } },
          orderBy: { createdAt: 'desc' },
        },
        vehicles: { include: { _count: { select: { inventoryDays: true } } } },
      },
      where: { id: partnerId },
    }),
    hotelService.getHotels(),
  ]);
  if (!partner) notFound();
  const assigned = new Set(partner.properties.map((property) => property.hotelSlug));
  const hotelInventorySources = new Map(
    hotels.map((hotel) => [hotel.slug, hotel.inventory.source] as const),
  );
  return (
    <section className="account-page admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="hotel-page__eyebrow">Authorized supplier servicing</p>
          <h1>{partner.name}</h1>
          <p>
            {partner.type} supplier · {partner.status} · named access only
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin/partners">
          Supplier directory
        </Link>
      </header>
      <div className="partner-bookings__summary">
        <Card>
          <span>Named users</span>
          <strong>{partner.members.length}</strong>
        </Card>
        <Card>
          <span>Properties</span>
          <strong>{partner.properties.length}</strong>
        </Card>
        <Card>
          <span>Vehicles</span>
          <strong>{partner.vehicles.length}</strong>
        </Card>
        <Card>
          <span>Audit events</span>
          <strong>{partner.auditEntries.length}</strong>
        </Card>
      </div>
      {partner.type === 'HOTEL' ? (
        <Card>
          <p className="hotel-page__eyebrow">Property scope</p>
          <h2>Assign a managed hotel</h2>
          <p>
            Platform hotels can be assigned here. Supplier-created properties and rooms are shown
            below with their publication state.
          </p>
          <AdminPartnerPropertyAssignment
            hotels={hotels
              .filter((hotel) => !assigned.has(hotel.slug))
              .map(({ inventory, name, slug }) => ({
                inventorySource: inventory.source,
                name,
                slug,
              }))}
            partnerId={partner.id}
          />
          <div className="partner-workspace__properties">
            {partner.properties.map((property) => (
              <Card id={`property-${property.id}`} key={property.id}>
                <strong>{property.displayName}</strong>
                <span>{property.hotelSlug}</span>
                <small>
                  {property.listingSource === 'MANAGED' ? 'Supplier managed' : 'Platform assigned'}
                  {' · '}
                  {inventorySourceLabel(
                    hotelInventorySources.get(property.hotelSlug) ??
                      (property.listingSource === 'MANAGED' ? 'direct' : 'supplier'),
                  )}
                  {' · '}
                  {property.publicationStatus.toLowerCase()}
                  {' · '}
                  {property.approvalStatus.toLowerCase().replaceAll('_', ' ')}
                  {' · '}
                  {property.rooms.length} room {property.rooms.length === 1 ? 'type' : 'types'}
                </small>
                {property.approvalNote ? <p>{property.approvalNote}</p> : null}
                {property.approvalStatus === 'PENDING_REVIEW' ? (
                  <AdminPropertyReviewActions partnerId={partner.id} propertyId={property.id} />
                ) : null}
              </Card>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="hotel-page__eyebrow">Fleet scope</p>
          <h2>Direct vehicle inventory</h2>
          {partner.vehicles.map((vehicle) => (
            <p key={vehicle.id}>
              <strong>{vehicle.vehicleName}</strong> · {vehicle.pickupLocation} to{' '}
              {vehicle.dropoffLocation} · {vehicle.totalUnits} units ·{' '}
              {vehicle._count.inventoryDays} daily controls
            </p>
          ))}
          {partner.vehicles.length === 0 ? <p>No vehicles have been published.</p> : null}
        </Card>
      )}
      <div className="partner-workspace__columns">
        <Card>
          <p className="hotel-page__eyebrow">Restricted evidence</p>
          <h2>Supplier compliance</h2>
          {partner.kycDocuments.length ? (
            partner.kycDocuments.map((document) => (
              <div key={document.id}>
                <p>
                  <strong>{document.documentType.replaceAll('_', ' ')}</strong> ·{' '}
                  {document.status.replaceAll('_', ' ')}
                  <br />
                  <small>
                    {document.versions[0]?.originalFilename ?? 'No verified file metadata'}
                    {document.expiresOn ? ` · expires ${document.expiresOn}` : ''}
                  </small>
                </p>
                <AdminPartnerKycReview
                  documentId={document.id}
                  lockVersion={document.lockVersion}
                  status={document.status}
                />
              </div>
            ))
          ) : (
            <p>No governed evidence is linked to this supplier.</p>
          )}
          <small>
            Evidence downloads remain disabled until private object storage, malware scanning, and
            audited signed reads are activated.
          </small>
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Access</p>
          <h2>Named supplier users</h2>
          {partner.members.map((member) => (
            <p key={member.id}>
              <strong>
                {member.user.firstName} {member.user.lastName}
              </strong>
              <br />
              {member.user.email} · {member.role}
            </p>
          ))}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Audit trail</p>
          <h2>Recent controlled changes</h2>
          {partner.auditEntries.map((entry) => (
            <p key={entry.id}>
              <strong>{entry.summary}</strong>
              <br />
              <small>
                {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'} ·{' '}
                {entry.createdAt.toLocaleString('en-IN')}
              </small>
            </p>
          ))}
        </Card>
      </div>
    </section>
  );
}
