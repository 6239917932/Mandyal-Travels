import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  HotelOperationalDocumentRuleError,
  normalizeHotelOperationalDocumentProfile,
  normalizeHotelOperationalDocumentVersion,
} from '../lib/pms/operationalDocuments.ts';

test('operational document profiles accept only bounded presentation choices', () => {
  assert.deepEqual(
    normalizeHotelOperationalDocumentProfile({
      footerText: '  Please keep this folio for your records.  ',
      headerText: '  Welcome to the Himalayas  ',
      showPropertyContact: true,
      template: 'compact',
      theme: 'emerald',
    }),
    {
      footerText: 'Please keep this folio for your records.',
      headerText: 'Welcome to the Himalayas',
      showPropertyContact: true,
      template: 'COMPACT',
      theme: 'EMERALD',
    },
  );
  assert.equal(normalizeHotelOperationalDocumentVersion('3'), 3);
});

test('operational document profiles reject open-ended layouts, themes, and stale versions', () => {
  for (const input of [
    { template: 'HTML', theme: 'OCEAN' },
    { template: 'CLASSIC', theme: 'url(javascript:alert(1))' },
  ]) {
    assert.throws(
      () => normalizeHotelOperationalDocumentProfile(input),
      HotelOperationalDocumentRuleError,
    );
  }
  assert.throws(() => normalizeHotelOperationalDocumentVersion(-1), {
    code: 'INVALID_DOCUMENT_VERSION',
  });
});

test('document profile mutations are tenant scoped, administrator only, same-origin, audited and stale-write protected', async () => {
  const [route, service, schema, sqliteMigration, postgresMigration] = await Promise.all([
    readFile(
      new URL('../app/api/v1/partner/document-templates/[propertyId]/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../services/partnerOperationalDocumentService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../prisma/migrations/20260915063000_add_operational_document_profiles/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260915063000_add_operational_document_profiles/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  assert.match(route, /isSameOriginMutation/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(route, /OPERATIONAL_DOCUMENT_PROFILE_UPDATED/);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /documentVersion: expectedVersion/);
  assert.match(service, /documentVersion: \{ increment: 1 \}/);
  assert.match(schema, /documentTemplate\s+String\s+@default\("CLASSIC"\)/);
  assert.match(sqliteMigration, /documentVersion/);
  assert.match(postgresMigration, /documentVersion/);
});

test('live PMS navigation and operational documents preserve mandatory evidence', async () => {
  const [registry, settingsPage, voucher, folio, repository] = await Promise.all([
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/document-templates/page.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../app/manage-booking/[confirmationCode]/voucher/page.tsx', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../app/partner/pms/billing/[confirmationCode]/print/page.tsx', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../repositories/hotelRepository.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(registry, /href: '\/partner\/pms\/document-templates'/);
  assert.match(registry, /name: 'Operational documents'/);
  assert.match(settingsPage, /tax calculations,[\s\S]*invoice identifiers remain/);
  assert.match(voucher, /data-document-template/);
  assert.match(voucher, /Mandyal Travels · \{booking\.hotelName\}/);
  assert.match(folio, /OPERATIONAL FOLIO · NOT A TAX INVOICE/);
  assert.match(folio, /payment-provider receipt, refund record, or settlement statement/);
  assert.match(repository, /documentShowContact/);
});
