import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  accountingAccountLabel,
  summarizeAccountingPostings,
} from '../lib/pms/accountingLedger.ts';

test('accounting summary accepts only valid debit and credit postings', () => {
  const result = summarizeAccountingPostings([
    { accountCode: 'CASH', amount: 1_000, direction: 'DEBIT' },
    { accountCode: 'SUPPLIER_PAYABLE', amount: 1_000, direction: 'CREDIT' },
    { accountCode: 'IGNORED', amount: -5, direction: 'DEBIT' },
    { accountCode: 'IGNORED', amount: 5, direction: 'OTHER' },
  ]);
  assert.equal(result.balanced, true);
  assert.equal(result.totalDebit, 1_000);
  assert.equal(result.totalCredit, 1_000);
  assert.equal(result.accounts.length, 2);
  assert.equal(accountingAccountLabel('SUPPLIER_PAYABLE'), 'supplier payable');
});

test('partner accounting ledger is read only, bounded, and supplier scoped', async () => {
  const [page, service, registry] = await Promise.all([
    readFile(new URL('../app/partner/pms/accounting/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerAccountingLedgerService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/pms/moduleRegistry.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /memberRole !== 'ADMIN'/);
  assert.match(service, /where: \{ partnerId \}/);
  assert.match(service, /take: MAX_POSTINGS \+ 1/);
  assert.doesNotMatch(
    service,
    /prisma\.[A-Za-z]+\.(?:create|update|delete)\(|transaction\.[A-Za-z]+\.(?:create|update|delete)\(/,
  );
  assert.doesNotMatch(page, /journal\.reference|providerRef/);
  assert.match(
    registry,
    /href: '\/partner\/pms\/accounting'[\s\S]*name: 'Accounting and ledgers'[\s\S]*status: 'LIVE'/,
  );
});
