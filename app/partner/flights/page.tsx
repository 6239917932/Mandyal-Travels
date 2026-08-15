import { redirect } from 'next/navigation';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { prisma } from '@/lib/prisma';

export default async function FlightSupplierPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'FLIGHT') redirect('/partner');
  const connections = await prisma.flightSupplierConnection.findMany({
    where: { partnerId: access.partnerId },
    orderBy: { updatedAt: 'desc' },
  });
  return (
    <section className="account-page">
      <div className="auth-page__intro">
        <p className="hotel-page__eyebrow">Flight supplier operations</p>
        <h1>{access.partnerName}</h1>
        <p>
          Govern provider credentials by secret reference, environment, health status, and auditable
          queued operations.
        </p>
      </div>
      <section className="ui-card ui-card--padded">
        <h2>Connections</h2>
        {connections.length ? (
          <ul>
            {connections.map((item) => (
              <li key={item.id}>
                <strong>{item.displayName}</strong> — {item.providerCode} / {item.environment} /{' '}
                {item.lastHealthStatus}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No flight supplier connections are configured. Use the partner API after commercial and
            provider credentials are approved.
          </p>
        )}
      </section>
    </section>
  );
}
