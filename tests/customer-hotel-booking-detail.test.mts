import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('hotel booking references and customer statuses are closed', () => {
  const service = readFileSync('services/customerHotelBookingDetailService.ts', 'utf8');
  assert.match(service, /HOTEL_REFERENCE_PATTERN = \/\^MT\[A-F0-9\]\{12\}\$\//);
  assert.match(service, /value\.trim\(\)\.toUpperCase\(\)/);
  assert.match(service, /case 'confirmed':[\s\S]*return 'CONFIRMED'/);
  assert.match(service, /case 'NO_SHOW':[\s\S]*return 'DID_NOT_CHECK_IN'/);
  assert.match(service, /default:[\s\S]*return 'UNDER_REVIEW'/);
});

test('servicing relations and their combined event history are absolutely bounded', () => {
  const service = readFileSync('services/customerHotelBookingDetailService.ts', 'utf8');
  assert.match(service, /CUSTOMER_HOTEL_AMENDMENT_LIMIT = 25/);
  assert.match(service, /CUSTOMER_HOTEL_SUPPORT_CASE_LIMIT = 25/);
  assert.match(service, /CUSTOMER_HOTEL_SERVICING_EVENT_LIMIT = 101/);
  assert.match(service, /take: CUSTOMER_HOTEL_AMENDMENT_LIMIT \+ 1/);
  assert.match(service, /take: CUSTOMER_HOTEL_SUPPORT_CASE_LIMIT \+ 1/);
  assert.match(service, /servicingHistory\.length > CUSTOMER_HOTEL_SERVICING_EVENT_LIMIT/);
});

test('ownership is normalized and every relational read remains booking and user scoped', () => {
  const service = readFileSync('services/customerHotelBookingDetailService.ts', 'utf8');
  assert.match(service, /normalizeEmail\(input\.sessionEmail\)/);
  assert.match(service, /booking\."confirmationCode" = \$\{confirmationCode\}/);
  assert.match(service, /LOWER\(TRIM\(guest\."email"\)\) = \$\{email\}/);
  assert.match(service, /where: \{ id: ownedBookings\[0\]\.id \}/);
  assert.match(service, /hotelBookingId: ownedBookings\[0\]\.id/);
  assert.match(service, /bookingReference: booking\.confirmationCode/);
  assert.match(service, /userId: input\.userId/);
});

test('detail projection excludes private operational and financial evidence', () => {
  const service = readFileSync('services/customerHotelBookingDetailService.ts', 'utf8');
  for (const privateSelection of [
    'accessTokenHash: true',
    'assignedRoomNumbersJson: true',
    'checkoutIntentId: true',
    'guest: true',
    'integrationEvents: true',
    'inventorySource: true',
    'partnerNote: true',
    'payment: true',
    'providerRef: true',
    'refunds: true',
    'reviewNote: true',
    'specialRequests: true',
  ]) {
    assert.ok(!service.includes(privateSelection), `${privateSelection} must remain private`);
  }
});

test('page is authenticated, read-only, and links only to owned servicing destinations', () => {
  const page = readFileSync('app/account/hotel-bookings/[confirmationCode]/page.tsx', 'utf8');
  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /not found or is not connected to the signed-in account/);
  assert.match(page, /View voucher/);
  assert.match(page, /View receipt/);
  assert.match(page, /Manage booking/);
  assert.match(page, /Contact support/);
  assert.match(page, /aria-label="Hotel booking actions"/);
  assert.match(page, /read-only record/);
  assert.doesNotMatch(page, /fetch\(|<form|dangerouslySetInnerHTML/);
});
