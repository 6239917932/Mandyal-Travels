import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('partner communication operations stay scoped, consent aware, and disclosure safe', async () => {
  const service = await read('services/partnerCommunicationOperationsService.ts');
  assert.match(service, /supplyPartnerMember\.findMany/);
  assert.match(service, /where: \{ partnerId \}/);
  assert.match(service, /hotelSlug: \{ in: hotelSlugs \}/);
  assert.match(service, /bookingEmailEnabled/);
  assert.match(service, /whatsappAlertsEnabled/);
  assert.match(service, /explicit\?\.status !== 'WITHDRAWN'/);
  assert.match(service, /privateRecipientReference/);
  assert.doesNotMatch(service, /recipient:\s*delivery\.recipient/);
});

test('provider posture requires complete allowlisted configuration', async () => {
  const service = await read('services/partnerCommunicationOperationsService.ts');
  assert.match(service, /EMAIL_FROM_ADDRESS/);
  assert.match(service, /EMAIL_SMTP_ALLOWED_HOSTS/);
  assert.match(service, /EMAIL_PROVIDER_ALLOWED_HOSTS/);
  assert.match(service, /MOBILE_MESSAGING_ALLOWED_HOSTS/);
  assert.match(service, /WHATSAPP_SENDER/);
  assert.match(service, /isAllowedProviderEndpoint/);
});

test('communications workspace reports evidence without sending or faking delivery', async () => {
  const page = await read('app/partner/pms/communications/page.tsx');
  assert.match(page, /getPartnerAccess/);
  assert.match(page, /getPartnerCommunicationOperations/);
  assert.match(page, /marked delivered only after/);
  assert.match(page, /Opt-in alone never represents delivery/);
  assert.match(page, /Manual\s+bulk messaging is intentionally unavailable/);
  assert.doesNotMatch(page, /enqueueNotification|sendMobileMessage|sendTransactionalEmail/);
  assert.doesNotMatch(page, /providerRef|lastError|recipient\}/);
});
