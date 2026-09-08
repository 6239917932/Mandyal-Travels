import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  VendorRegistrationForm,
  VendorStatusForm,
} from '@/components/partner/VendorManagementControls';
import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerVendorWorkspace } from '@/services/partnerVendorService';

export const metadata: Metadata = { title: 'Vendor management | Mandyal PMS' };

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ');
}

export default async function PartnerVendorManagementPage() {
  const access = await getPartnerAccess();
  if (
    !access?.partnerId ||
    !access.userId ||
    access.partnerType !== 'HOTEL' ||
    access.memberRole !== 'ADMIN'
  )
    redirect('/partner');
  const workspace = await getPartnerVendorWorkspace(access.partnerId);
  const activeCount = workspace.vendors.filter((vendor) => vendor.status === 'ACTIVE').length;
  const categories = new Set(workspace.vendors.map((vendor) => vendor.category)).size;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">Procurement · controlled vendor directory</p>
            <h1>Vendor management</h1>
            <p className="booking-page__intro">
              Maintain property-scoped suppliers, contact ownership, commercial terms, and an
              immutable activation history without storing bank credentials.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href="/partner/pms/procurement">
            Procurement
          </Link>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            Display safety limit reached. Contact the platform administrator before recording more
            vendor activity.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Registered vendors</span>
            <strong>{workspace.vendors.length}</strong>
          </Card>
          <Card>
            <span>Active vendors</span>
            <strong>{activeCount}</strong>
          </Card>
          <Card>
            <span>Supply categories</span>
            <strong>{categories}</strong>
          </Card>
          <Card>
            <span>Recorded decisions</span>
            <strong>{workspace.events.length}</strong>
          </Card>
        </div>

        <div className="partner-workspace__columns">
          <Card>
            <p className="hotel-page__eyebrow">Vendor master</p>
            <h2>Register a property supplier</h2>
            <VendorRegistrationForm
              properties={workspace.properties.map((property) => ({
                id: property.id,
                name: property.displayName,
              }))}
            />
          </Card>
          <Card>
            <p className="hotel-page__eyebrow">Lifecycle control</p>
            <h2>Pause or reactivate a vendor</h2>
            <p>
              Status changes require a reason and never erase the vendor or its prior decisions.
            </p>
            <VendorStatusForm
              vendors={workspace.vendors.map((vendor) => ({
                id: vendor.id,
                label: `${vendor.property.displayName} · ${vendor.vendorCode} · ${vendor.legalName}`,
                status: vendor.status,
                version: vendor.version,
              }))}
            />
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Vendor directory</p>
          <h2>Current property suppliers</h2>
          {workspace.vendors.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Property</th>
                    <th scope="col">Code</th>
                    <th scope="col">Vendor</th>
                    <th scope="col">Category</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Terms</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>{vendor.property.displayName}</td>
                      <td>{vendor.vendorCode}</td>
                      <th scope="row">
                        {vendor.tradingName || vendor.legalName}
                        <small>{vendor.tradingName ? vendor.legalName : ''}</small>
                      </th>
                      <td>{label(vendor.category)}</td>
                      <td>
                        {vendor.contactName}
                        <small>{vendor.email || vendor.phone}</small>
                      </td>
                      <td>
                        {vendor.paymentTermsDays ? `${vendor.paymentTermsDays} days` : 'Immediate'}
                      </td>
                      <td>
                        <span
                          className={`partner-status partner-status--${vendor.status === 'ACTIVE' ? 'approved' : 'pending'}`}
                        >
                          {vendor.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No vendors have been registered.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Immutable history</p>
          <h2>Recent vendor decisions</h2>
          {workspace.events.length ? (
            <ul className="pms-room-rack__queue-list">
              {workspace.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.property.displayName} · {event.vendor.vendorCode} ·{' '}
                    {event.action.toLowerCase()}
                  </strong>
                  <span>{event.note}</span>
                  <small>
                    {event.fromStatus.toLowerCase()} → {event.toStatus.toLowerCase()} ·{' '}
                    {event.createdAt.toLocaleString('en-IN')}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No vendor decisions have been recorded.</p>
          )}
        </Card>

        <Card>
          <p>
            This directory does not approve purchase orders, release payments, or store bank account
            numbers, UPI credentials, PINs, or OTPs. Procurement and finance approvals remain
            separate controlled workflows.
          </p>
        </Card>
      </div>
    </main>
  );
}
