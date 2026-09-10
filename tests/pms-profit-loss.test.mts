import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildManagementProfitLoss, isExplicitExpenseAccount } from '../lib/pms/profitLoss.ts';

test('management result allocates stays and nets folio reversals and explicit expenses', () => {
  const report = buildManagementProfitLoss({
    bookings: [{ checkInDate: '2026-09-01', checkOutDate: '2026-09-03', totalAmount: 1_001 }],
    dates: ['2026-09-01', '2026-09-02'],
    folioEntries: [
      { amount: 300, businessDate: '2026-09-01', entryType: 'CHARGE' },
      {
        amount: 50,
        businessDate: '2026-09-01',
        entryType: 'REVERSAL',
        reversalOfType: 'CHARGE',
      },
      { amount: 400, businessDate: '2026-09-01', entryType: 'PAYMENT' },
    ],
    postings: [
      {
        accountCode: 'OPERATING_EXPENSE',
        amount: 100,
        businessDate: '2026-09-01',
        direction: 'DEBIT',
      },
      {
        accountCode: 'OPERATING_EXPENSE',
        amount: 20,
        businessDate: '2026-09-02',
        direction: 'CREDIT',
      },
      {
        accountCode: 'SUPPLIER_PAYABLE',
        amount: 999,
        businessDate: '2026-09-01',
        direction: 'CREDIT',
      },
    ],
  });
  assert.equal(report.rows[0]?.accommodationRevenue, 501);
  assert.equal(report.rows[1]?.accommodationRevenue, 500);
  assert.equal(report.totals.supplementalCharges, 250);
  assert.equal(report.totals.recordedExpenses, 80);
  assert.equal(report.totals.provisionalResult, 1_171);
  assert.equal(report.totals.collections, 400);
  assert.deepEqual(report.expenseAccounts, [{ accountCode: 'OPERATING_EXPENSE', amount: 80 }]);
});

test('expense classification is explicit and excludes liabilities and customer refunds', () => {
  assert.equal(isExplicitExpenseAccount('laundry_expense'), true);
  assert.equal(isExplicitExpenseAccount('EXPENSE_BANK_FEES'), true);
  assert.equal(isExplicitExpenseAccount('COST_OF_GOODS_SOLD'), true);
  assert.equal(isExplicitExpenseAccount('SUPPLIER_PAYABLE'), false);
  assert.equal(isExplicitExpenseAccount('CUSTOMER_REFUNDS'), false);
});

test('profit/loss workspace is read only, bounded, supplier scoped and caveated', async () => {
  const [page, service] = await Promise.all([
    readFile(new URL('../app/partner/pms/profit-loss/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerProfitLossService.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /memberRole !== 'ADMIN'/);
  assert.match(page, /not statutory profit/i);
  assert.match(page, /does not create expenses/i);
  assert.match(service, /partnerId: input\.partnerId/);
  assert.match(service, /take: MAX_ROWS \+ 1/);
  assert.doesNotMatch(
    service,
    /prisma\.[A-Za-z]+\.(?:create|update|delete)\(|transaction\.[A-Za-z]+\.(?:create|update|delete)\(/,
  );
});
