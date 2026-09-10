import { isIsoCalendarDate } from './operationalDate.ts';

const DAY_MS = 86_400_000;
export const TALLY_EXPORT_MAX_DAYS = 366;
export const TALLY_EXPORT_MAX_JOURNALS = 200;

export class TallyExportRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type TallyExportPosting = Readonly<{
  accountCode: string;
  amount: number;
  description: string;
  direction: string;
}>;

export type TallyExportJournal = Readonly<{
  createdAt: Date | string;
  currency: string;
  description: string;
  privateReference: string;
  postings: readonly TallyExportPosting[];
  sourceType: string;
  status: string;
  totalCredit: number;
  totalDebit: number;
}>;

function addDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function normalizeTallyExportRange(input: {
  defaultThrough: string;
  from?: unknown;
  through?: unknown;
}) {
  const through = input.through ?? input.defaultThrough;
  const from = input.from ?? addDays(input.defaultThrough, -30);
  if (typeof from !== 'string' || typeof through !== 'string') {
    throw new TallyExportRuleError('INVALID_EXPORT_RANGE', 'Choose a valid export date range.');
  }
  if (!isIsoCalendarDate(from) || !isIsoCalendarDate(through)) {
    throw new TallyExportRuleError('INVALID_EXPORT_RANGE', 'Choose valid export dates.');
  }
  const days =
    Math.floor(
      (Date.parse(`${through}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS,
    ) + 1;
  if (days < 1 || days > TALLY_EXPORT_MAX_DAYS) {
    throw new TallyExportRuleError(
      'INVALID_EXPORT_RANGE',
      `Choose a period of ${TALLY_EXPORT_MAX_DAYS} days or fewer.`,
    );
  }
  return { days, from, through, throughExclusive: addDays(through, 1) } as const;
}

export function escapeTallyXml(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function isEligibleTallyJournal(journal: TallyExportJournal): boolean {
  return (
    journal.status === 'POSTED' &&
    journal.currency === 'INR' &&
    Number.isSafeInteger(journal.totalDebit) &&
    journal.totalDebit > 0 &&
    journal.totalDebit === journal.totalCredit &&
    journal.postings.length > 0 &&
    journal.postings.every(
      (posting) =>
        Number.isSafeInteger(posting.amount) &&
        posting.amount > 0 &&
        (posting.direction === 'DEBIT' || posting.direction === 'CREDIT') &&
        Boolean(posting.accountCode.trim()),
    )
  );
}

function tallyDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TallyExportRuleError(
      'INVALID_JOURNAL_DATE',
      'A journal has an invalid posting date.',
    );
  }
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function tallyAmount(direction: string, amount: number): string {
  return `${direction === 'DEBIT' ? '-' : ''}${amount}.00`;
}

function ledgerEntry(name: string, direction: 'CREDIT' | 'DEBIT', amount: number): string {
  return [
    '<ALLLEDGERENTRIES.LIST>',
    `<LEDGERNAME>${escapeTallyXml(name)}</LEDGERNAME>`,
    `<ISDEEMEDPOSITIVE>${direction === 'DEBIT' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>`,
    `<AMOUNT>${tallyAmount(direction, amount)}</AMOUNT>`,
    '</ALLLEDGERENTRIES.LIST>',
  ].join('');
}

function voucher(journal: TallyExportJournal, scopeDescription: string): string {
  const orderedPostings = [...journal.postings].sort(
    (left, right) =>
      left.accountCode.localeCompare(right.accountCode) ||
      left.direction.localeCompare(right.direction) ||
      left.amount - right.amount ||
      left.description.localeCompare(right.description),
  );
  const debit = orderedPostings
    .filter((posting) => posting.direction === 'DEBIT')
    .reduce((sum, posting) => sum + posting.amount, 0);
  const credit = orderedPostings
    .filter((posting) => posting.direction === 'CREDIT')
    .reduce((sum, posting) => sum + posting.amount, 0);
  const clearing =
    debit === credit
      ? ''
      : ledgerEntry(
          'MANDYAL SETTLEMENT CLEARING',
          debit > credit ? 'CREDIT' : 'DEBIT',
          Math.abs(debit - credit),
        );
  const entries = orderedPostings
    .map((posting) =>
      ledgerEntry(posting.accountCode, posting.direction as 'CREDIT' | 'DEBIT', posting.amount),
    )
    .join('');
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    '<VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">',
    `<DATE>${tallyDate(journal.createdAt)}</DATE>`,
    `<VOUCHERNUMBER>${escapeTallyXml(journal.privateReference)}</VOUCHERNUMBER>`,
    '<VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>',
    `<NARRATION>${escapeTallyXml(`${journal.description} [${journal.sourceType}] · ${scopeDescription}`)}</NARRATION>`,
    '<PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>',
    entries,
    clearing,
    '</VOUCHER>',
    '</TALLYMESSAGE>',
  ].join('');
}

export function createTallyXml(input: {
  companyName: string;
  from: string;
  journals: readonly TallyExportJournal[];
  propertyName: string;
  through: string;
}) {
  if (!input.journals.length || input.journals.length > TALLY_EXPORT_MAX_JOURNALS) {
    throw new TallyExportRuleError(
      'INVALID_JOURNAL_COUNT',
      `Export one to ${TALLY_EXPORT_MAX_JOURNALS} eligible journals at a time.`,
    );
  }
  if (!input.journals.every(isEligibleTallyJournal)) {
    throw new TallyExportRuleError(
      'INELIGIBLE_JOURNAL',
      'Only posted, balanced INR journals can be exported.',
    );
  }
  const ordered = [...input.journals].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
      left.privateReference.localeCompare(right.privateReference),
  );
  const scopeDescription = `${input.propertyName} · ${input.from} to ${input.through}`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ENVELOPE>',
    '<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>',
    '<BODY><IMPORTDATA>',
    '<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES>',
    `<SVCURRENTCOMPANY>${escapeTallyXml(input.companyName)}</SVCURRENTCOMPANY>`,
    '</STATICVARIABLES></REQUESTDESC>',
    '<REQUESTDATA>',
    ordered.map((journal) => voucher(journal, scopeDescription)).join(''),
    '</REQUESTDATA>',
    '</IMPORTDATA></BODY>',
    '</ENVELOPE>',
  ].join('');
}
