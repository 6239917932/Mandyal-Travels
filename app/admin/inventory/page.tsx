import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import type { Prisma } from '@/generated/prisma/client';
import { getPlatformAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_INVENTORY_PAGE_SIZE,
  ADMIN_INVENTORY_RESULT_LIMIT,
  adminInventoryPath,
  assessAdminInventory,
  normalizeAdminInventoryFilters,
} from '@/services/adminInventoryGovernanceService';
import { formatLocalCalendarDate, offsetLocalCalendarDate } from '@/utils/localDate';

export const metadata: Metadata = { title: 'Inventory and rate governance' };

type PageProps = {
  searchParams: Promise<{
    horizon?: string | string[];
    page?: string | string[];
    q?: string | string[];
    state?: string | string[];
  }>;
};

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  if (!(await getPlatformAdmin())) redirect('/login?returnTo=/admin/inventory');
  const filters = normalizeAdminInventoryFilters(await searchParams);
  const today = formatLocalCalendarDate(new Date());
  const horizonEnd = offsetLocalCalendarDate(today, filters.horizon);
  const where: Prisma.PartnerRoomTypeWhereInput = {
    ...(filters.query
      ? {
          OR: [
            { name: { contains: filters.query } },
            { roomTypeId: { contains: filters.query } },
            { property: { displayName: { contains: filters.query } } },
            { property: { hotelSlug: { contains: filters.query } } },
            { property: { city: { contains: filters.query } } },
            { property: { partner: { name: { contains: filters.query } } } },
          ],
        }
      : {}),
    status: 'ACTIVE',
  };
  const baseCount = await prisma.partnerRoomType.count({ where });
  const overLimit = baseCount > ADMIN_INVENTORY_RESULT_LIMIT;
  const roomTypes = overLimit
    ? []
    : await prisma.partnerRoomType.findMany({
        include: {
          property: {
            include: { partner: { select: { id: true, name: true } } },
          },
          ratePlans: {
            include: {
              inventoryDays: {
                where: { stayDate: { gte: today, lt: horizonEnd } },
              },
            },
            where: { status: 'ACTIVE' },
          },
        },
        orderBy: [{ property: { displayName: 'asc' } }, { name: 'asc' }],
        take: ADMIN_INVENTORY_RESULT_LIMIT,
        where,
      });
  const calendarDays = roomTypes.length
    ? await prisma.partnerHotelInventoryDay.findMany({
        orderBy: { stayDate: 'asc' },
        where: {
          roomTypeId: { in: roomTypes.map((room) => room.roomTypeId) },
          stayDate: { gte: today, lt: horizonEnd },
        },
      })
    : [];
  const daysByRoom = new Map<string, typeof calendarDays>();
  for (const day of calendarDays) {
    const days = daysByRoom.get(day.roomTypeId) ?? [];
    days.push(day);
    daysByRoom.set(day.roomTypeId, days);
  }
  const assessed = roomTypes.map((room) => {
    const days = daysByRoom.get(room.roomTypeId) ?? [];
    const assessment = assessAdminInventory({
      activeRatePlans: room.ratePlans.length,
      baseInventory: room.inventoryCount,
      days,
    });
    const prices = [
      room.nightlyRate,
      ...room.ratePlans.map((plan) => plan.nightlyRate),
      ...room.ratePlans.flatMap((plan) => plan.inventoryDays.map((day) => day.nightlyRate)),
    ];
    return { assessment, maximumRate: Math.max(...prices), minimumRate: Math.min(...prices), room };
  });
  const filtered = assessed.filter(
    ({ assessment }) => filters.state === 'ALL' || assessment.health === filters.state,
  );
  const attentionCount = filtered.filter(({ assessment }) =>
    ['CAPACITY_ISSUE', 'RATE_MISSING'].includes(assessment.health),
  ).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_INVENTORY_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const rows = filtered.slice(
    (page - 1) * ADMIN_INVENTORY_PAGE_SIZE,
    page * ADMIN_INVENTORY_PAGE_SIZE,
  );

  return (
    <section className="account-page business-report admin-workspace">
      <header className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Protected supply governance</p>
          <h1>Inventory and rate directory</h1>
          <p>
            Inspect room capacity, active rate plans, seasonal prices, restrictions, and stop-sales
            without changing partner inventory or commercial rules.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/admin">
          Back to operations
        </Link>
      </header>

      <form className="business-report__filters" method="get">
        <div className="ui-field business-report__search">
          <label className="ui-field__label" htmlFor="admin-inventory-search">
            Room, property, supplier, slug, or destination
          </label>
          <input
            className="ui-input"
            defaultValue={filters.query}
            id="admin-inventory-search"
            maxLength={100}
            name="q"
            type="search"
          />
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Operational state</span>
          <select className="ui-input" defaultValue={filters.state} name="state">
            <option value="ALL">All states</option>
            <option value="ON_SALE">On sale</option>
            <option value="STOP_SELL">Stop-sell dates</option>
            <option value="SOLD_OUT">Sold-out dates</option>
            <option value="RESTRICTED">Stay or arrival restrictions</option>
            <option value="RATE_MISSING">Missing active rate plan</option>
            <option value="CAPACITY_ISSUE">Capacity issue</option>
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Forward view</span>
          <select className="ui-input" defaultValue={filters.horizon} name="horizon">
            <option value="7">Next 7 days</option>
            <option value="30">Next 30 days</option>
            <option value="90">Next 90 days</option>
          </select>
        </label>
        <div className="business-report__filter-actions">
          <button className="ui-button ui-button--primary" type="submit">
            Apply filters
          </button>
          <Link className="ui-button ui-button--secondary" href="/admin/inventory">
            Clear
          </Link>
        </div>
      </form>

      {overLimit ? (
        <Card className="admin-empty-state">
          This query matches {baseCount.toLocaleString('en-IN')} room types. Narrow the search to no
          more than {ADMIN_INVENTORY_RESULT_LIMIT.toLocaleString('en-IN')} records.
        </Card>
      ) : (
        <>
          <div className="partner-bookings__summary">
            <Card>
              <span>Filtered room types</span>
              <strong>{filtered.length.toLocaleString('en-IN')}</strong>
            </Card>
            <Card>
              <span>Structural issues</span>
              <strong>{attentionCount.toLocaleString('en-IN')}</strong>
            </Card>
            <Card>
              <span>Stop-sell room types</span>
              <strong>
                {filtered
                  .filter(({ assessment }) => assessment.stopSellDates > 0)
                  .length.toLocaleString('en-IN')}
              </strong>
            </Card>
            <Card>
              <span>Calendar window</span>
              <strong>{filters.horizon} days</strong>
            </Card>
          </div>

          <Card className="business-report__table-card">
            <div className="business-report__table-scroll">
              <table className="business-report__table">
                <thead>
                  <tr>
                    <th>Property and room</th>
                    <th>Supplier</th>
                    <th>Capacity</th>
                    <th>Rate posture</th>
                    <th>Calendar controls</th>
                    <th>Governance state</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ assessment, maximumRate, minimumRate, room }) => (
                    <tr key={room.id}>
                      <td>
                        <strong>{room.property.displayName}</strong>
                        <span>{room.name}</span>
                        <span>{room.roomTypeId}</span>
                      </td>
                      <td>
                        <Link href={`/admin/partners/${room.property.partner.id}`}>
                          {room.property.partner.name}
                        </Link>
                        <span>
                          {room.property.city || room.property.state || 'Location incomplete'}
                        </span>
                      </td>
                      <td>
                        <strong>{room.inventoryCount} base rooms</strong>
                        <span>{assessment.soldOutDates} zero-capacity dates</span>
                        {assessment.capacityIssueDates ? (
                          <span>{assessment.capacityIssueDates} invalid override dates</span>
                        ) : null}
                      </td>
                      <td>
                        <strong>
                          ₹{minimumRate.toLocaleString('en-IN')}
                          {maximumRate === minimumRate
                            ? ''
                            : ` – ₹${maximumRate.toLocaleString('en-IN')}`}
                        </strong>
                        <span>
                          {room.ratePlans.length} active rate{' '}
                          {room.ratePlans.length === 1 ? 'plan' : 'plans'}
                        </span>
                      </td>
                      <td>
                        <strong>{assessment.overrideDates} inventory override dates</strong>
                        <span>{assessment.stopSellDates} stop-sell dates</span>
                        <span>{assessment.restrictedDates} restricted dates</span>
                      </td>
                      <td>
                        <span className="admin-status-badge">{label(assessment.health)}</span>
                        <Link
                          href={`/admin/catalog?q=${encodeURIComponent(room.property.hotelSlug)}`}
                        >
                          Open catalog record
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No room types match these inventory filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <nav
            aria-label="Inventory and rate directory pages"
            className="business-audit-pagination"
          >
            {page > 1 ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminInventoryPath(filters, page - 1)}
              >
                Previous page
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="ui-button ui-button--secondary"
                href={adminInventoryPath(filters, page + 1)}
              >
                Next page
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </section>
  );
}
