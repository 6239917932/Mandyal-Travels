import 'server-only';

import { createHash } from 'node:crypto';

import { summarizeAccountingPostings } from '@/lib/pms/accountingLedger';
import { prisma } from '@/lib/prisma';

const MAX_POSTINGS = 500;

function privateJournalReference(reference: string) {
  return createHash('sha256').update(`partner-journal:${reference}`).digest('hex').slice(0, 12);
}

export async function getPartnerAccountingLedger(partnerId: string) {
  const postings = await prisma.financialJournalPosting.findMany({
    include: {
      journal: {
        select: {
          createdAt: true,
          currency: true,
          reference: true,
          sourceType: true,
          status: true,
          totalCredit: true,
          totalDebit: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_POSTINGS + 1,
    where: { partnerId },
  });
  const bounded = postings.slice(0, MAX_POSTINGS);
  const currencies = [...new Set(bounded.map((posting) => posting.journal.currency))];
  const summary = summarizeAccountingPostings(bounded);
  return {
    accounts: summary.accounts,
    balanced: summary.balanced,
    currencies,
    currency: currencies.length === 1 ? currencies[0] : 'INR',
    currencyConflict: currencies.length > 1,
    journalCount: new Set(bounded.map((posting) => posting.journalId)).size,
    postings: bounded.map((posting) => ({
      accountCode: posting.accountCode,
      amount: posting.amount,
      createdAt: posting.createdAt,
      currency: posting.journal.currency,
      description: posting.description,
      direction: posting.direction,
      journalBalanced: posting.journal.totalDebit === posting.journal.totalCredit,
      journalReference: privateJournalReference(posting.journal.reference),
      sourceType: posting.journal.sourceType,
      status: posting.journal.status,
    })),
    safetyLimitReached: postings.length > MAX_POSTINGS,
    totalCredit: summary.totalCredit,
    totalDebit: summary.totalDebit,
  } as const;
}
