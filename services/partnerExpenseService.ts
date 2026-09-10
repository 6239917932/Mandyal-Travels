import 'server-only';

import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';

export const HOTEL_EXPENSE_CATEGORIES = [
  'FOOD_SUPPLIES',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'UTILITIES',
  'MARKETING',
  'TRANSPORT',
  'OTHER',
] as const;

export class PartnerExpenseError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function expenseReference(sourceId: string) {
  return `HOTEL-EXPENSE-${createHash('sha256').update(sourceId).digest('hex').slice(0, 20).toUpperCase()}`;
}

export async function recordPartnerExpense(input: {
  actorUserId: string;
  idempotencyKey: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const propertyId = text(input.values.propertyId, 100);
  const businessDate = text(input.values.businessDate, 10);
  const category = text(input.values.category, 40).toUpperCase();
  const description = text(input.values.description, 240);
  const amount = Number(input.values.amount);
  const idempotencyKey = text(input.idempotencyKey, 100);
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(idempotencyKey))
    throw new PartnerExpenseError(
      'INVALID_IDEMPOTENCY_KEY',
      'Refresh and submit the expense again.',
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(businessDate) ||
    Number.isNaN(Date.parse(`${businessDate}T00:00:00.000Z`))
  )
    throw new PartnerExpenseError('INVALID_BUSINESS_DATE', 'Choose a valid expense date.');
  if (!HOTEL_EXPENSE_CATEGORIES.some((value) => value === category))
    throw new PartnerExpenseError(
      'INVALID_EXPENSE_CATEGORY',
      'Choose a supported expense category.',
    );
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000)
    throw new PartnerExpenseError(
      'INVALID_EXPENSE_AMOUNT',
      'Enter an expense from ₹1 to ₹10,00,00,000.',
    );
  if (description.length < 5)
    throw new PartnerExpenseError(
      'INVALID_EXPENSE_DESCRIPTION',
      'Enter a description of at least 5 characters.',
    );

  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: {
      id: propertyId,
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property)
    throw new PartnerExpenseError('PROPERTY_NOT_FOUND', 'Choose an active managed property.');
  const sourceId = `${property.id}:${idempotencyKey}`;
  const existing = await prisma.financialJournal.findUnique({
    where: { sourceType_sourceId: { sourceId, sourceType: 'HOTEL_EXPENSE' } },
  });
  if (existing) return existing;

  return prisma.financialJournal.create({
    data: {
      createdByUserId: input.actorUserId,
      createdAt: new Date(`${businessDate}T12:00:00.000Z`),
      currency: 'INR',
      description: `${businessDate} · ${category.replaceAll('_', ' ')} · ${description}`,
      postings: {
        create: [
          {
            accountCode: `EXPENSE_${category}`,
            amount,
            description,
            direction: 'DEBIT',
            partnerId: input.partnerId,
          },
          {
            accountCode: 'CASH_AND_BANK',
            amount,
            description: `Expense settlement · ${description}`,
            direction: 'CREDIT',
            partnerId: input.partnerId,
          },
        ],
      },
      reference: expenseReference(sourceId),
      sourceId,
      sourceType: 'HOTEL_EXPENSE',
      totalCredit: amount,
      totalDebit: amount,
    },
  });
}

export async function reversePartnerExpense(input: {
  actorUserId: string;
  journalId: string;
  note: unknown;
  partnerId: string;
}) {
  const note = text(input.note, 240);
  if (note.length < 5)
    throw new PartnerExpenseError(
      'INVALID_REVERSAL_NOTE',
      'Enter a reversal reason of at least 5 characters.',
    );
  const original = await prisma.financialJournal.findFirst({
    include: { postings: { where: { partnerId: input.partnerId } } },
    where: {
      id: input.journalId,
      postings: { some: { partnerId: input.partnerId } },
      sourceType: 'HOTEL_EXPENSE',
      status: 'POSTED',
    },
  });
  if (!original)
    throw new PartnerExpenseError('EXPENSE_NOT_FOUND', 'The posted expense was not found.');
  const propertyId = original.sourceId.split(':', 1)[0] ?? '';
  const reversalSourceId = `${propertyId}:${original.id}`;
  const existing = await prisma.financialJournal.findUnique({
    where: {
      sourceType_sourceId: { sourceId: reversalSourceId, sourceType: 'HOTEL_EXPENSE_REVERSAL' },
    },
  });
  if (existing) return existing;
  return prisma.financialJournal.create({
    data: {
      createdByUserId: input.actorUserId,
      currency: original.currency,
      description: `Reversal · ${note} · ${original.description}`.slice(0, 500),
      postings: {
        create: original.postings.map((posting) => ({
          accountCode: posting.accountCode,
          amount: posting.amount,
          description: `Reversal · ${note}`,
          direction: posting.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          partnerId: input.partnerId,
        })),
      },
      reference: `REV-${original.reference}`.slice(0, 100),
      sourceId: reversalSourceId,
      sourceType: 'HOTEL_EXPENSE_REVERSAL',
      totalCredit: original.totalDebit,
      totalDebit: original.totalCredit,
    },
  });
}
