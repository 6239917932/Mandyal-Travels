import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createTallyXml,
  escapeTallyXml,
  isEligibleTallyJournal,
  normalizeTallyExportRange,
  TallyExportRuleError,
  type TallyExportJournal,
} from '../lib/pms/tallyExport.ts';

const journal: TallyExportJournal = {
  createdAt: '2026-09-10T08:30:00.000Z',
  currency: 'INR',
  description: 'Supplier payable <confirmed>',
  postings: [
    {
      accountCode: 'SUPPLIER_PAYABLE',
      amount: 1200,
      description: 'Hotel & settlement',
      direction: 'CREDIT',
    },
  ],
  privateReference: 'A1B2C3D4',
  sourceType: 'PAYMENT_CAPTURE',
  status: 'POSTED',
  totalCredit: 1500,
  totalDebit: 1500,
};

test('Tally export range is bounded and inclusive', () => {
  assert.deepEqual(
    normalizeTallyExportRange({
      defaultThrough: '2026-09-10',
      from: '2026-09-01',
      through: '2026-09-10',
    }),
    { days: 10, from: '2026-09-01', through: '2026-09-10', throughExclusive: '2026-09-11' },
  );
  assert.throws(
    () =>
      normalizeTallyExportRange({
        defaultThrough: '2026-09-10',
        from: '2025-01-01',
        through: '2026-09-10',
      }),
    TallyExportRuleError,
  );
});

test('XML escaping strips invalid controls and escapes markup', () => {
  assert.equal(
    escapeTallyXml(`Hotel & <Room> "A" 'B'\u0001`),
    'Hotel &amp; &lt;Room&gt; &quot;A&quot; &apos;B&apos;',
  );
});

test('only posted balanced INR journals with attributed postings are eligible', () => {
  assert.equal(isEligibleTallyJournal(journal), true);
  assert.equal(isEligibleTallyJournal({ ...journal, status: 'DRAFT' }), false);
  assert.equal(isEligibleTallyJournal({ ...journal, totalCredit: 1499 }), false);
  assert.equal(isEligibleTallyJournal({ ...journal, currency: 'USD' }), false);
  assert.equal(isEligibleTallyJournal({ ...journal, postings: [] }), false);
});

test('Tally XML is deterministic, escaped and balances the partner projection', () => {
  const input = {
    companyName: 'Mandyal & Hotel <Test>',
    from: '2026-09-01',
    journals: [journal],
    propertyName: 'Test property',
    through: '2026-09-10',
  };
  const first = createTallyXml(input);
  assert.equal(first, createTallyXml(input));
  assert.match(first, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(first, /<SVCURRENTCOMPANY>Mandyal &amp; Hotel &lt;Test&gt;<\/SVCURRENTCOMPANY>/);
  assert.match(first, /<VOUCHERNUMBER>A1B2C3D4<\/VOUCHERNUMBER>/);
  assert.match(
    first,
    /<LEDGERNAME>SUPPLIER_PAYABLE<\/LEDGERNAME>[\s\S]*<AMOUNT>1200\.00<\/AMOUNT>/,
  );
  assert.match(
    first,
    /<LEDGERNAME>MANDYAL SETTLEMENT CLEARING<\/LEDGERNAME>[\s\S]*<AMOUNT>-1200\.00<\/AMOUNT>/,
  );
  assert.match(first, /Supplier payable &lt;confirmed&gt;/);
  assert.doesNotMatch(first, /<LEDGERNAME>PLATFORM_/);
});

test('Tally page and download are administrator-only, scoped and fail closed', async () => {
  const [route, service, page, accountingPage] = await Promise.all([
    readFile(new URL('../app/api/v1/partner/tally-export/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerTallyExportService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/tally-export/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/accounting/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /isSameOriginMutation\(request\)/);
  assert.match(route, /access\.memberRole !== 'ADMIN'/);
  assert.match(route, /Cache-Control': 'private, no-store'/);
  assert.match(route, /application\/xml/);
  assert.match(service, /where: \{ partnerId: input\.partnerId \}/);
  assert.match(service, /hotelSlug: selected\.hotelSlug/);
  assert.match(service, /take: TALLY_EXPORT_MAX_JOURNALS \+ 1/);
  assert.match(service, /status: 'POSTED'/);
  assert.match(page, /not a statutory book/i);
  assert.match(page, /Map PMS accounts to Tally ledger names/);
  assert.match(accountingPage, /\/partner\/pms\/tally-export/);
});
