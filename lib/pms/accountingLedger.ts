export type AccountingPosting = Readonly<{
  accountCode: string;
  amount: number;
  direction: string;
}>;

export function summarizeAccountingPostings(postings: readonly AccountingPosting[]) {
  const accounts = new Map<string, { credit: number; debit: number }>();
  let totalCredit = 0;
  let totalDebit = 0;
  for (const posting of postings) {
    if (!Number.isSafeInteger(posting.amount) || posting.amount < 0) continue;
    if (posting.direction !== 'DEBIT' && posting.direction !== 'CREDIT') continue;
    const account = accounts.get(posting.accountCode) ?? { credit: 0, debit: 0 };
    if (posting.direction === 'DEBIT') {
      account.debit += posting.amount;
      totalDebit += posting.amount;
    } else {
      account.credit += posting.amount;
      totalCredit += posting.amount;
    }
    accounts.set(posting.accountCode, account);
  }
  return {
    accounts: [...accounts.entries()]
      .map(([accountCode, totals]) => ({ accountCode, ...totals }))
      .sort((left, right) => left.accountCode.localeCompare(right.accountCode)),
    balanced: totalDebit === totalCredit,
    totalCredit,
    totalDebit,
  } as const;
}

export function accountingAccountLabel(accountCode: string) {
  return accountCode.toLowerCase().replaceAll('_', ' ');
}
