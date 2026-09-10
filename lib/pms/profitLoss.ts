import { allocateBookingValueForDate } from './ownerOverview.ts';

export type ManagementProfitLossBooking = Readonly<{
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
}>;

export type ManagementProfitLossFolioEntry = Readonly<{
  amount: number;
  businessDate: string;
  category?: string;
  entryType: string;
  reversalOfType?: string;
}>;

export type ManagementProfitLossPosting = Readonly<{
  accountCode: string;
  amount: number;
  businessDate: string;
  direction: string;
}>;

const EXPLICIT_EXPENSE_ACCOUNTS = new Set([
  'COST_OF_GOODS_SOLD',
  'COST_OF_SALES',
  'OPERATING_COST',
  'OPERATING_EXPENSE',
]);

export function isExplicitExpenseAccount(accountCode: string): boolean {
  const normalized = accountCode.trim().toUpperCase();
  return (
    EXPLICIT_EXPENSE_ACCOUNTS.has(normalized) ||
    normalized.startsWith('EXPENSE_') ||
    normalized.endsWith('_EXPENSE')
  );
}

function validAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function buildManagementProfitLoss(input: {
  bookings: readonly ManagementProfitLossBooking[];
  dates: readonly string[];
  folioEntries: readonly ManagementProfitLossFolioEntry[];
  postings: readonly ManagementProfitLossPosting[];
}) {
  let invalidDataDetected = false;
  const expenseAccounts = new Map<string, number>();

  const rows = input.dates.map((businessDate) => {
    const accommodationRevenue = input.bookings.reduce((total, booking) => {
      if (!validAmount(booking.totalAmount)) {
        invalidDataDetected = true;
        return total;
      }
      return total + allocateBookingValueForDate({ ...booking, businessDate });
    }, 0);
    let supplementalCharges = 0;
    let collections = 0;
    for (const entry of input.folioEntries.filter(
      (candidate) => candidate.businessDate === businessDate,
    )) {
      if (!validAmount(entry.amount)) {
        invalidDataDetected = true;
        continue;
      }
      if (entry.entryType === 'CHARGE') {
        supplementalCharges += entry.category === 'DISCOUNT' ? -entry.amount : entry.amount;
      }
      if (entry.entryType === 'PAYMENT') collections += entry.amount;
      if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'CHARGE') {
        supplementalCharges += entry.category === 'DISCOUNT' ? entry.amount : -entry.amount;
      }
      if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'PAYMENT') {
        collections -= entry.amount;
      }
    }
    let recordedExpenses = 0;
    for (const posting of input.postings.filter(
      (candidate) => candidate.businessDate === businessDate,
    )) {
      if (!isExplicitExpenseAccount(posting.accountCode)) continue;
      if (!validAmount(posting.amount)) {
        invalidDataDetected = true;
        continue;
      }
      const signedAmount =
        posting.direction === 'DEBIT'
          ? posting.amount
          : posting.direction === 'CREDIT'
            ? -posting.amount
            : 0;
      if (posting.direction !== 'DEBIT' && posting.direction !== 'CREDIT') {
        invalidDataDetected = true;
        continue;
      }
      recordedExpenses += signedAmount;
      expenseAccounts.set(
        posting.accountCode,
        (expenseAccounts.get(posting.accountCode) ?? 0) + signedAmount,
      );
    }
    const operatingRevenue = accommodationRevenue + supplementalCharges;
    return {
      accommodationRevenue,
      businessDate,
      collections,
      operatingRevenue,
      provisionalResult: operatingRevenue - recordedExpenses,
      recordedExpenses,
      supplementalCharges,
    } as const;
  });

  const totals = rows.reduce(
    (result, row) => ({
      accommodationRevenue: result.accommodationRevenue + row.accommodationRevenue,
      collections: result.collections + row.collections,
      operatingRevenue: result.operatingRevenue + row.operatingRevenue,
      provisionalResult: result.provisionalResult + row.provisionalResult,
      recordedExpenses: result.recordedExpenses + row.recordedExpenses,
      supplementalCharges: result.supplementalCharges + row.supplementalCharges,
    }),
    {
      accommodationRevenue: 0,
      collections: 0,
      operatingRevenue: 0,
      provisionalResult: 0,
      recordedExpenses: 0,
      supplementalCharges: 0,
    },
  );

  return {
    expenseAccounts: [...expenseAccounts.entries()]
      .map(([accountCode, amount]) => ({ accountCode, amount }))
      .sort(
        (left, right) =>
          right.amount - left.amount || left.accountCode.localeCompare(right.accountCode),
      ),
    invalidDataDetected,
    rows,
    totals,
  } as const;
}
