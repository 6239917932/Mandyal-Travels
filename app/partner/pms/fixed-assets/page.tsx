import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { FixedAssetEventForm, FixedAssetForm } from '@/components/partner/FixedAssetControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerFixedAssetWorkspace } from '@/services/partnerFixedAssetService';

export const metadata: Metadata = { title: 'Fixed assets | Mandyal PMS' };

export default async function PartnerFixedAssetsPage() {
  const access = await getPartnerAccess();
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    redirect('/partner');
  const workspace = await getPartnerFixedAssetWorkspace(access.partnerId);
  const unverified = workspace.assets.filter((item) => !item.lastVerifiedAt).length;
  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Fixed assets · immutable custody register</p>
            <h1>Fixed-asset register</h1>
            <p className="booking-page__intro">
              Register property equipment, preserve invoice provenance, and record physical
              verification or movement without rewriting history.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/maintenance">
            Maintenance
          </Link>
        </header>
        <div className="partner-bookings__summary">
          <Card>
            <span>Active assets</span>
            <strong>{workspace.assets.length}</strong>
          </Card>
          <Card>
            <span>Awaiting verification</span>
            <strong>{unverified}</strong>
          </Card>
          <Card>
            <span>Recorded events</span>
            <strong>{workspace.events.length}</strong>
          </Card>
          <Card>
            <span>Depreciation posting</span>
            <strong>Not released</strong>
          </Card>
        </div>
        <Card>
          <p className="hotel-page__eyebrow">Asset master</p>
          <h2>Register controlled property equipment</h2>
          <FixedAssetForm
            properties={workspace.properties.map((property) => ({
              id: property.id,
              name: property.displayName,
            }))}
          />
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Custody evidence</p>
          <h2>Verify or move an asset</h2>
          <FixedAssetEventForm
            assets={workspace.assets.map((asset) => ({
              custodian: asset.custodian,
              id: asset.id,
              label: `${asset.property.displayName} · ${asset.assetTag} · ${asset.name}`,
              location: asset.location,
              version: asset.version,
            }))}
          />
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Asset register</p>
          <h2>Current controlled assets</h2>
          {workspace.assets.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Tag</th>
                    <th scope="col">Asset</th>
                    <th scope="col">Category</th>
                    <th scope="col">Location</th>
                    <th scope="col">Cost</th>
                    <th scope="col">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.assets.map((asset) => (
                    <tr key={asset.id}>
                      <td>{asset.property.displayName}</td>
                      <td>{asset.assetTag}</td>
                      <th scope="row">{asset.name}</th>
                      <td>{asset.category.toLowerCase().replaceAll('_', ' ')}</td>
                      <td>{asset.location}</td>
                      <td>
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: asset.currency,
                        }).format(asset.acquisitionCostMinor / 100)}
                      </td>
                      <td>
                        {asset.lastVerifiedAt
                          ? asset.lastVerifiedAt.toLocaleDateString('en-IN')
                          : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No fixed assets have been registered.</p>
          )}
        </Card>
        <Card>
          <p className="hotel-page__eyebrow">Immutable history</p>
          <h2>Recent asset events</h2>
          {workspace.events.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.property.displayName} · {event.asset.assetTag} ·{' '}
                    {event.eventType.toLowerCase()}
                  </strong>
                  <span>{event.note}</span>
                  <small>{event.createdAt.toLocaleString('en-IN')}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No asset events have been recorded.</p>
          )}
        </Card>
        <Card>
          <p>
            Depreciation, disposal gains or losses, and statutory accounting postings remain
            disabled until an approved capitalization and tax policy exists. Consumable stock and
            repairs remain outside this register.
          </p>
        </Card>
      </div>
    </main>
  );
}
