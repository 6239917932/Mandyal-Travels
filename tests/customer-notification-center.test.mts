import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  customerNotificationInternalStatuses,
  customerNotificationPath,
  customerNotificationStatus,
  customerNotificationTitle,
  normalizeCustomerNotificationFilters,
} from '../services/customerNotificationCenterService.ts';

test('customer notification filters are bounded and allowlisted', () => {
  assert.deepEqual(
    normalizeCustomerNotificationFilters({
      channel: 'whatsapp',
      page: '3',
      status: 'delayed',
      window: '90',
    }),
    { channel: 'WHATSAPP', page: 3, status: 'DELAYED', window: '90' },
  );
  assert.deepEqual(
    normalizeCustomerNotificationFilters({
      channel: 'FAX',
      page: '999',
      status: 'FAILED',
      window: '365',
    }),
    { channel: 'ALL', page: 25, status: 'ALL', window: '30' },
  );
});

test('customer notification filters map to safe internal statuses and stable page paths', () => {
  assert.deepEqual(customerNotificationInternalStatuses('PENDING'), ['QUEUED', 'PROCESSING']);
  assert.deepEqual(customerNotificationInternalStatuses('DELAYED'), ['FAILED', 'DEAD_LETTER']);
  assert.equal(customerNotificationInternalStatuses('ALL'), null);
  assert.equal(
    customerNotificationPath({ channel: 'SMS', page: 4, status: 'PENDING', window: '90' }, 2),
    '/account/notifications?page=2&status=PENDING&channel=SMS&window=90',
  );
});

test('delivery state and template names are customer friendly', () => {
  assert.deepEqual(customerNotificationStatus('DELIVERED'), {
    label: 'Delivered',
    tone: 'positive',
  });
  assert.deepEqual(customerNotificationStatus('DEAD_LETTER'), {
    label: 'Delivery delayed',
    tone: 'attention',
  });
  assert.deepEqual(customerNotificationStatus('UNKNOWN'), {
    label: 'Status unavailable',
    tone: 'neutral',
  });
  assert.equal(customerNotificationTitle('HOTEL_BOOKING_CONFIRMED'), 'Booking update');
  assert.equal(customerNotificationTitle('INTERNAL_PROVIDER_EVENT'), 'Account update');
});

test('notification history is session protected, exactly user scoped, and disclosure safe', async () => {
  const page = await readFile(
    new URL('../app/account/notifications/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(page, /getCurrentUser\(\)/);
  assert.match(page, /redirect\('\/login\?returnTo=%2Faccount%2Fnotifications'\)/);
  assert.match(
    page,
    /const where: Prisma\.NotificationDeliveryWhereInput = \{\s*userId: user\.id,/,
  );
  assert.match(page, /where: \{ status: 'DELIVERED', userId: user\.id \}/);
  assert.match(page, /template: \{ select: \{ templateKey: true \} \}/);
  for (const prohibited of [
    'recipient: true',
    'providerRef: true',
    'lastError: true',
    'variablesJson: true',
    'dedupeKey: true',
    'attempts: true',
    'nextAttemptAt: true',
    'id: true',
    'subject: true',
    'body: true',
  ]) {
    assert.doesNotMatch(page, new RegExp(prohibited));
  }
});
