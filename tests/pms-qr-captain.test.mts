import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('guest restaurant orders authorize an active stay and use server-held menu prices', async () => {
  const [service, route, form] = await Promise.all([
    read('services/guestRestaurantOrderService.ts'),
    read('app/api/v1/guest/restaurant-orders/route.ts'),
    read('components/guest/GuestRestaurantOrderForm.tsx'),
  ]);
  assert.match(service, /getAuthorizedManagedBooking/);
  assert.match(service, /operationalStatus !== 'CHECKED_IN'/);
  assert.match(service, /listingSource: 'MANAGED'/);
  assert.match(service, /menuItems\.length !== requested\.length/);
  assert.match(service, /unitPrice: menuItem\.unitPrice/);
  assert.match(service, /createPartnerHotelPosOrder/);
  assert.match(service, /GUEST_BOOKING:/);
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /x-idempotency-key/);
  assert.match(form, /api\/v1\/guest\/restaurant-orders/);
  assert.doesNotMatch(form, /unitPrice.*JSON\.stringify/);
});

test('captain console links checked-in stays to guest menus and the audited kitchen workflow', async () => {
  const [captain, guestPage, link] = await Promise.all([
    read('app/partner/pms/captain/page.tsx'),
    read('app/qr-order/[confirmationCode]/page.tsx'),
    read('components/partner/CaptainGuestOrderLink.tsx'),
  ]);
  assert.match(captain, /getPartnerAccess/);
  assert.match(captain, /getPartnerHotelPosWorkspace/);
  assert.match(captain, /HotelPosOrderForm/);
  assert.match(captain, /HotelPosTransitionControls/);
  assert.match(captain, /CaptainGuestOrderLink/);
  assert.match(guestPage, /getGuestRestaurantOrderWorkspace/);
  assert.match(guestPage, /GuestRestaurantOrderForm/);
  assert.match(link, /navigator\.share/);
  assert.match(link, /navigator\.clipboard\.writeText/);
  assert.match(link, /\/qr-order\//);
  assert.match(link, /QRCode\.toDataURL/);
  assert.match(link, /Download QR/);
});
