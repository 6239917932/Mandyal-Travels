import 'server-only';

import { prisma } from '@/lib/prisma';

export class PartnerPayrollError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function valueText(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

export async function postPartnerPayroll(input: {
  actorUserId: string;
  partnerId: string;
  values: Record<string, unknown>;
}) {
  const propertyId = valueText(input.values.propertyId, 100);
  const memberId = valueText(input.values.memberId, 100);
  const period = valueText(input.values.period, 7);
  const note = valueText(input.values.note, 240);
  const grossAmount = Number(input.values.grossAmount);
  const deductionAmount = Number(input.values.deductionAmount);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    throw new PartnerPayrollError('INVALID_PAYROLL_PERIOD', 'Choose a valid payroll month.');
  if (!Number.isSafeInteger(grossAmount) || grossAmount < 1 || grossAmount > 100_000_000)
    throw new PartnerPayrollError('INVALID_GROSS_AMOUNT', 'Enter a valid gross amount.');
  if (
    !Number.isSafeInteger(deductionAmount) ||
    deductionAmount < 0 ||
    deductionAmount >= grossAmount
  )
    throw new PartnerPayrollError(
      'INVALID_DEDUCTION_AMOUNT',
      'Deductions must be zero or less than gross pay.',
    );
  if (note.length < 5)
    throw new PartnerPayrollError(
      'INVALID_PAYROLL_NOTE',
      'Enter an approval note of at least 5 characters.',
    );
  const [property, member] = await Promise.all([
    prisma.partnerProperty.findFirst({
      select: { id: true },
      where: {
        id: propertyId,
        listingSource: 'MANAGED',
        partnerId: input.partnerId,
        status: 'ACTIVE',
      },
    }),
    prisma.supplyPartnerMember.findFirst({
      select: { id: true },
      where: { id: memberId, partnerId: input.partnerId, user: { accessStatus: 'ACTIVE' } },
    }),
  ]);
  if (!property)
    throw new PartnerPayrollError('PROPERTY_NOT_FOUND', 'Choose an active managed property.');
  if (!member)
    throw new PartnerPayrollError('MEMBER_NOT_FOUND', 'Choose an active named staff account.');
  const latest = await prisma.hotelPayrollRecord.findFirst({
    orderBy: { revision: 'desc' },
    where: { memberId, partnerId: input.partnerId, period },
  });
  if (latest?.status === 'POSTED') return latest;
  const revision = (latest?.revision ?? 0) + 1;
  const netAmount = grossAmount - deductionAmount;
  return prisma.$transaction(async (transaction) => {
    const record = await transaction.hotelPayrollRecord.create({
      data: {
        createdByUserId: input.actorUserId,
        deductionAmount,
        grossAmount,
        memberId,
        netAmount,
        note,
        partnerId: input.partnerId,
        period,
        propertyId,
        revision,
      },
    });
    await transaction.financialJournal.create({
      data: {
        createdByUserId: input.actorUserId,
        currency: 'INR',
        description: `Payroll ${period} · ${note}`.slice(0, 500),
        postings: {
          create: [
            {
              accountCode: 'EXPENSE_PAYROLL',
              amount: grossAmount,
              description: `Payroll expense ${period}`,
              direction: 'DEBIT',
              partnerId: input.partnerId,
            },
            ...(deductionAmount
              ? [
                  {
                    accountCode: 'PAYROLL_DEDUCTIONS',
                    amount: deductionAmount,
                    description: `Approved deductions ${period}`,
                    direction: 'CREDIT',
                    partnerId: input.partnerId,
                  },
                ]
              : []),
            {
              accountCode: 'PAYROLL_PAYABLE',
              amount: netAmount,
              description: `Net payroll payable ${period}`,
              direction: 'CREDIT',
              partnerId: input.partnerId,
            },
          ],
        },
        reference: `HOTEL-PAYROLL-${record.id}`,
        sourceId: `${propertyId}:${record.id}`,
        sourceType: 'HOTEL_PAYROLL',
        totalCredit: grossAmount,
        totalDebit: grossAmount,
      },
    });
    return record;
  });
}

export async function reversePartnerPayroll(input: {
  actorUserId: string;
  note: unknown;
  partnerId: string;
  recordId: string;
  version: unknown;
}) {
  const note = valueText(input.note, 240);
  const version = Number(input.version);
  if (note.length < 5)
    throw new PartnerPayrollError('INVALID_REVERSAL_NOTE', 'Enter a reversal reason.');
  if (!Number.isSafeInteger(version) || version < 1)
    throw new PartnerPayrollError('INVALID_VERSION', 'Refresh the payroll register.');
  return prisma.$transaction(async (transaction) => {
    const record = await transaction.hotelPayrollRecord.findFirst({
      where: { id: input.recordId, partnerId: input.partnerId, status: 'POSTED', version },
    });
    if (!record)
      throw new PartnerPayrollError(
        'PAYROLL_CONFLICT',
        'This payroll record changed. Refresh and try again.',
      );
    const journal = await transaction.financialJournal.findUnique({
      include: { postings: { where: { partnerId: input.partnerId } } },
      where: {
        sourceType_sourceId: {
          sourceId: `${record.propertyId}:${record.id}`,
          sourceType: 'HOTEL_PAYROLL',
        },
      },
    });
    if (!journal)
      throw new PartnerPayrollError(
        'PAYROLL_JOURNAL_MISSING',
        'The payroll journal is unavailable for reversal.',
      );
    const updated = await transaction.hotelPayrollRecord.updateMany({
      data: {
        reversedAt: new Date(),
        reversedByUserId: input.actorUserId,
        status: 'REVERSED',
        version: { increment: 1 },
      },
      where: { id: record.id, status: 'POSTED', version },
    });
    if (updated.count !== 1)
      throw new PartnerPayrollError(
        'PAYROLL_CONFLICT',
        'This payroll record changed. Refresh and try again.',
      );
    await transaction.financialJournal.create({
      data: {
        createdByUserId: input.actorUserId,
        currency: journal.currency,
        description: `Payroll reversal · ${note}`,
        postings: {
          create: journal.postings.map((posting) => ({
            accountCode: posting.accountCode,
            amount: posting.amount,
            description: `Payroll reversal · ${note}`,
            direction: posting.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
            partnerId: input.partnerId,
          })),
        },
        reference: `REV-${journal.reference}`,
        sourceId: `${record.propertyId}:${record.id}`,
        sourceType: 'HOTEL_PAYROLL_REVERSAL',
        totalCredit: journal.totalDebit,
        totalDebit: journal.totalCredit,
      },
    });
    return { ...record, status: 'REVERSED', version: version + 1 };
  });
}
