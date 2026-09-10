import 'server-only';

import { prisma } from '@/lib/prisma';
import { accountingAccountLabel } from '@/lib/pms/accountingLedger';
import { buildManagementProfitLoss, isExplicitExpenseAccount } from '@/lib/pms/profitLoss';
import { normalizeHotelOperationalReportRange } from '@/lib/pms/operationalReport';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';

const MAX_PROPERTIES = 100;
const MAX_ROWS = 5_000;

export class PartnerProfitLossError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export async function getPartnerProfitLoss(input: {
  from?: string;
  memberRole?: string;
  partnerId: string;
  requestedPropertyId?: string;
  through?: string;
}) {
  if (input.memberRole !== 'ADMIN') {
    throw new PartnerProfitLossError(
      'FINANCE_ACCESS_REQUIRED',
      'A hotel partner administrator is required to view management financial reports.',
    );
  }
  const storedProperties = await prisma.partnerProperty.findMany({
    orderBy: { displayName: 'asc' },
    select: {
      displayName: true,
      hotelSlug: true,
      id: true,
      operationalDate: true,
      timezone: true,
    },
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId: input.partnerId, status: 'ACTIVE' },
  });
  const properties = storedProperties.slice(0, MAX_PROPERTIES);
  const selected =
    properties.find((property) => property.id === input.requestedPropertyId) ?? properties[0];
  if (!selected) {
    return {
      properties: [],
      safetyLimitReached: storedProperties.length > MAX_PROPERTIES,
    } as const;
  }
  const range = normalizeHotelOperationalReportRange({
    defaultThrough: resolveOperationalDate(selected.operationalDate, selected.timezone),
    from: input.from,
    through: input.through,
  });
  const postingThrough = new Date(`${addDays(range.through, 1)}T00:00:00.000Z`);
  const [bookings, folioEntries, storedPostings, manualExpenseJournals, expenseReversals] =
    await Promise.all([
      prisma.booking.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          currency: true,
          quote: { select: { checkInDate: true, checkOutDate: true } },
          totalAmount: true,
        },
        take: MAX_ROWS + 1,
        where: {
          hotelSlug: selected.hotelSlug,
          operationalStatus: { not: 'NO_SHOW' },
          quote: { checkInDate: { lte: range.through }, checkOutDate: { gt: range.from } },
          status: 'confirmed',
        },
      }),
      prisma.hotelFolioEntry.findMany({
        include: { reversalOf: { select: { entryType: true } } },
        orderBy: { createdAt: 'asc' },
        take: MAX_ROWS + 1,
        where: {
          booking: { hotelSlug: selected.hotelSlug },
          businessDate: { gte: range.from, lte: range.through },
        },
      }),
      prisma.financialJournalPosting.findMany({
        include: {
          journal: {
            select: { currency: true, status: true, totalCredit: true, totalDebit: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_ROWS + 1,
        where: {
          createdAt: { gte: new Date(`${range.from}T00:00:00.000Z`), lt: postingThrough },
          partnerId: input.partnerId,
          journal: {
            OR: [
              { payment: { is: { booking: { is: { hotelSlug: selected.hotelSlug } } } } },
              { refund: { is: { booking: { is: { hotelSlug: selected.hotelSlug } } } } },
              {
                sourceId: { startsWith: `${selected.id}:` },
                sourceType: {
                  in: [
                    'HOTEL_EXPENSE',
                    'HOTEL_EXPENSE_REVERSAL',
                    'HOTEL_PAYROLL',
                    'HOTEL_PAYROLL_REVERSAL',
                  ],
                },
              },
            ],
          },
        },
      }),
      prisma.financialJournal.findMany({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, description: true, id: true, totalDebit: true },
        take: 50,
        where: {
          createdAt: { gte: new Date(`${range.from}T00:00:00.000Z`), lt: postingThrough },
          postings: { some: { partnerId: input.partnerId } },
          sourceId: { startsWith: `${selected.id}:` },
          sourceType: 'HOTEL_EXPENSE',
          status: 'POSTED',
        },
      }),
      prisma.financialJournal.findMany({
        select: { sourceId: true },
        where: {
          postings: { some: { partnerId: input.partnerId } },
          sourceId: { startsWith: `${selected.id}:` },
          sourceType: 'HOTEL_EXPENSE_REVERSAL',
          status: 'POSTED',
        },
      }),
    ]);
  const reversedExpenseIds = new Set(
    expenseReversals.map((journal) => journal.sourceId.slice(selected.id.length + 1)),
  );
  const postings = storedPostings.slice(0, MAX_ROWS);
  const expensePostings = postings.filter((posting) =>
    isExplicitExpenseAccount(posting.accountCode),
  );
  const currencies = new Set([
    ...bookings.slice(0, MAX_ROWS).map((booking) => booking.currency.trim().toUpperCase()),
    ...folioEntries.slice(0, MAX_ROWS).map((entry) => entry.currency.trim().toUpperCase()),
    ...expensePostings.map((posting) => posting.journal.currency.trim().toUpperCase()),
  ]);
  const currency = currencies.size === 1 ? ([...currencies][0] ?? 'INR') : 'INR';
  const currencyConflict = currencies.size > 1 || !/^[A-Z]{3}$/.test(currency);
  const summary = buildManagementProfitLoss({
    bookings: bookings.slice(0, MAX_ROWS).map((booking) => ({
      checkInDate: booking.quote.checkInDate,
      checkOutDate: booking.quote.checkOutDate,
      totalAmount: booking.totalAmount,
    })),
    dates: range.dates,
    folioEntries: folioEntries.slice(0, MAX_ROWS).map((entry) => ({
      amount: entry.amount,
      businessDate: entry.businessDate,
      category: entry.category,
      entryType: entry.entryType,
      reversalOfType: entry.reversalOf?.entryType,
    })),
    postings: expensePostings.map((posting) => ({
      accountCode: posting.accountCode,
      amount: posting.amount,
      businessDate: posting.createdAt.toISOString().slice(0, 10),
      direction: posting.direction,
    })),
  });
  const safetyLimitReached =
    storedProperties.length > MAX_PROPERTIES ||
    bookings.length > MAX_ROWS ||
    folioEntries.length > MAX_ROWS ||
    storedPostings.length > MAX_ROWS;
  const journalControlFailure = expensePostings.some(
    (posting) =>
      posting.journal.status !== 'POSTED' ||
      posting.journal.totalDebit !== posting.journal.totalCredit,
  );
  return {
    ...range,
    ...summary,
    currency,
    currencyConflict,
    expenseAccountLabels: summary.expenseAccounts.map((account) => ({
      ...account,
      label: accountingAccountLabel(account.accountCode),
    })),
    financialComplete:
      !safetyLimitReached &&
      !currencyConflict &&
      !summary.invalidDataDetected &&
      !journalControlFailure,
    journalControlFailure,
    properties: properties.map((property) => ({ id: property.id, name: property.displayName })),
    recentExpenses: manualExpenseJournals.map((journal) => ({
      amount: journal.totalDebit,
      createdAt: journal.createdAt.toISOString(),
      description: journal.description,
      id: journal.id,
      reversed: reversedExpenseIds.has(journal.id),
    })),
    safetyLimitReached,
    selectedProperty: { id: selected.id, name: selected.displayName },
  } as const;
}
