import 'server-only';

import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { resolveOperationalDate } from '@/lib/pms/operationalDate';
import {
  isEligibleTallyJournal,
  normalizeTallyExportRange,
  TALLY_EXPORT_MAX_JOURNALS,
  TallyExportRuleError,
  type TallyExportJournal,
} from '@/lib/pms/tallyExport';

const MAX_PROPERTIES = 100;

function privateReference(reference: string) {
  return createHash('sha256')
    .update(`tally-partner-journal:${reference}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

export async function getPartnerTallyExport(input: {
  from?: unknown;
  partnerId: string;
  propertyId?: unknown;
  through?: unknown;
}) {
  const properties = await prisma.partnerProperty.findMany({
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
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
  const boundedProperties = properties.slice(0, MAX_PROPERTIES);
  const requestedPropertyId = typeof input.propertyId === 'string' ? input.propertyId.trim() : '';
  const requestedProperty = boundedProperties.find(
    (property) => property.id === requestedPropertyId,
  );
  if (requestedPropertyId && !requestedProperty) {
    throw new TallyExportRuleError(
      'PROPERTY_NOT_FOUND',
      'Choose an active managed property assigned to this partner.',
    );
  }
  const selected = requestedProperty ?? boundedProperties[0];
  if (!selected) {
    return {
      eligibleJournals: [],
      excludedCount: 0,
      from: '',
      mappings: [],
      partnerCredit: 0,
      partnerDebit: 0,
      properties: [],
      safetyLimitReached: properties.length > MAX_PROPERTIES,
      selectedProperty: undefined,
      through: '',
    } as const;
  }
  const defaultThrough = resolveOperationalDate(selected.operationalDate, selected.timezone);
  const range = normalizeTallyExportRange({
    defaultThrough,
    from: input.from,
    through: input.through,
  });
  const mappings = await prisma.partnerAccountingMapping.findMany({
    orderBy: { accountCode: 'asc' },
    select: { accountCode: true, tallyLedgerName: true, version: true },
    where: { partnerId: input.partnerId, propertyId: selected.id },
  });
  const mappingByCode = new Map(
    mappings.map((mapping) => [mapping.accountCode, mapping.tallyLedgerName]),
  );
  const stored = await prisma.financialJournal.findMany({
    include: {
      payment: { select: { booking: { select: { hotelSlug: true } } } },
      postings: {
        orderBy: [{ accountCode: 'asc' }, { direction: 'asc' }, { id: 'asc' }],
        select: {
          accountCode: true,
          amount: true,
          description: true,
          direction: true,
        },
        where: { partnerId: input.partnerId },
      },
      refund: { select: { booking: { select: { hotelSlug: true } } } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: TALLY_EXPORT_MAX_JOURNALS + 1,
    where: {
      createdAt: {
        gte: new Date(`${range.from}T00:00:00.000Z`),
        lt: new Date(`${range.throughExclusive}T00:00:00.000Z`),
      },
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
      postings: { some: { partnerId: input.partnerId } },
      status: 'POSTED',
    },
  });
  const bounded = stored.slice(0, TALLY_EXPORT_MAX_JOURNALS);
  const presented: TallyExportJournal[] = bounded.map((journal) => ({
    createdAt: journal.createdAt,
    currency: journal.currency,
    description: journal.description.slice(0, 240),
    postings: journal.postings.map((posting) => ({
      ...posting,
      accountCode: mappingByCode.get(posting.accountCode) ?? posting.accountCode,
    })),
    privateReference: privateReference(journal.reference),
    sourceType: journal.sourceType.slice(0, 80),
    status: journal.status,
    totalCredit: journal.totalCredit,
    totalDebit: journal.totalDebit,
  }));
  const eligibleJournals = presented.filter(isEligibleTallyJournal);
  const discoveredAccountCodes = [
    ...new Set(
      bounded.flatMap((journal) => journal.postings.map((posting) => posting.accountCode)),
    ),
  ].sort();
  const totals = eligibleJournals.reduce(
    (result, journal) => {
      for (const posting of journal.postings) {
        if (posting.direction === 'DEBIT') result.partnerDebit += posting.amount;
        if (posting.direction === 'CREDIT') result.partnerCredit += posting.amount;
      }
      return result;
    },
    { partnerCredit: 0, partnerDebit: 0 },
  );
  return {
    ...range,
    eligibleJournals,
    excludedCount: presented.length - eligibleJournals.length,
    mappings: discoveredAccountCodes.map((accountCode) => {
      const saved = mappings.find((mapping) => mapping.accountCode === accountCode);
      return {
        accountCode,
        tallyLedgerName: saved?.tallyLedgerName ?? accountCode,
        version: saved?.version ?? 0,
      };
    }),
    properties: boundedProperties.map((property) => ({
      id: property.id,
      name: property.displayName,
    })),
    safetyLimitReached:
      properties.length > MAX_PROPERTIES || stored.length > TALLY_EXPORT_MAX_JOURNALS,
    selectedProperty: { id: selected.id, name: selected.displayName },
    ...totals,
  } as const;
}
