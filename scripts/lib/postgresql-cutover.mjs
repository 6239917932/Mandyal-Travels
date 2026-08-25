import { createHash } from 'node:crypto';

const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;

export const FINANCIAL_RECONCILIATION_FIELDS = Object.freeze({
  FinancialJournal: ['totalDebit', 'totalCredit'],
  FinancialJournalPosting: ['amount'],
  FinancialLedgerEntry: ['amount'],
  PartnerSettlement: ['grossAmount', 'netAmount'],
  PartnerSettlementLine: ['grossAmount', 'netAmount'],
  PaymentAllocation: ['amount'],
  PaymentTransaction: ['amount'],
  RefundRequest: ['amount'],
});

export function quoteDatabaseIdentifier(identifier) {
  if (!SAFE_IDENTIFIER.test(identifier)) throw new Error('DATABASE_IDENTIFIER_INVALID');
  return `"${identifier}"`;
}

export function extractCanonicalTableNames(baselineSql) {
  const names = [...baselineSql.matchAll(/^CREATE TABLE "([A-Za-z][A-Za-z0-9_]*)"/gm)].map(
    (match) => match[1],
  );
  if (!names.length || new Set(names).size !== names.length) {
    throw new Error('POSTGRESQL_BASELINE_TABLES_INVALID');
  }
  return names;
}

export function baselineChecksum(baselineSql) {
  return createHash('sha256').update(baselineSql.replace(/\r\n/g, '\n')).digest('hex');
}

export function compareDatabaseSnapshots(source, target) {
  const mismatches = [];
  const tableNames = [
    ...new Set([...Object.keys(source.tables), ...Object.keys(target.tables)]),
  ].sort();
  for (const table of tableNames) {
    const sourceCount = source.tables[table];
    const targetCount = target.tables[table];
    if (sourceCount !== targetCount) {
      mismatches.push({
        key: `table:${table}`,
        source: sourceCount ?? null,
        target: targetCount ?? null,
      });
    }
  }
  const metricNames = [
    ...new Set([...Object.keys(source.financial), ...Object.keys(target.financial)]),
  ].sort();
  for (const metric of metricNames) {
    const sourceValue = source.financial[metric];
    const targetValue = target.financial[metric];
    if (sourceValue !== targetValue) {
      mismatches.push({
        key: `financial:${metric}`,
        source: sourceValue ?? null,
        target: targetValue ?? null,
      });
    }
  }
  return mismatches;
}
