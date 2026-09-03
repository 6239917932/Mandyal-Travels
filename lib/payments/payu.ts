import { createHash, timingSafeEqual } from 'node:crypto';

const PAYU_REFERENCE_PATTERN = /^[A-Za-z0-9]{8,50}$/;
const SHA512_PATTERN = /^[0-9a-f]{128}$/i;

export type PayuVerifiedTransaction = Readonly<{
  amount: number;
  captured: boolean;
  failed: boolean;
  payuPaymentId: string;
  status: string;
  transactionId: string;
}>;

function sha512(value: string): string {
  return createHash('sha512').update(value, 'utf8').digest('hex');
}

function safeHashEqual(expected: string, received: string): boolean {
  if (!SHA512_PATTERN.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received.toLowerCase(), 'hex'));
}

export function payuTransactionId(idempotencyKey: string): string {
  return `MT${createHash('sha256').update(idempotencyKey, 'utf8').digest('hex').slice(0, 30)}`;
}

export function isPayuTransactionId(value: string): boolean {
  return PAYU_REFERENCE_PATTERN.test(value) && value.startsWith('MT');
}

export function payuCommandHash(input: {
  command: string;
  key: string;
  salt: string;
  variable: string;
}): string {
  return sha512(`${input.key}|${input.command}|${input.variable}|${input.salt}`);
}

export function verifyPayuResponseHash(
  fields: Readonly<Record<string, string>>,
  salt: string,
): boolean {
  const received = fields.hash ?? '';
  const additionalCharges = fields.additionalCharges?.trim();
  const base = [
    salt,
    fields.status ?? '',
    '',
    '',
    '',
    '',
    '',
    fields.udf5 ?? '',
    fields.udf4 ?? '',
    fields.udf3 ?? '',
    fields.udf2 ?? '',
    fields.udf1 ?? '',
    fields.email ?? '',
    fields.firstname ?? '',
    fields.productinfo ?? '',
    fields.amount ?? '',
    fields.txnid ?? '',
    fields.key ?? '',
  ].join('|');
  const expected = sha512(additionalCharges ? `${additionalCharges}|${base}` : base);
  return safeHashEqual(expected, received);
}

export function parsePayuAmount(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim();
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction && Number(fraction.padEnd(2, '0')) !== 0) return null;
  const amount = Number(whole);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function parsePayuVerifiedTransaction(
  transactionId: string,
  payload: unknown,
): PayuVerifiedTransaction | null {
  if (!isPayuTransactionId(transactionId) || !payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (
    Number(root.status) !== 1 ||
    !root.transaction_details ||
    typeof root.transaction_details !== 'object'
  ) {
    return null;
  }
  const details = (root.transaction_details as Record<string, unknown>)[transactionId];
  if (!details || typeof details !== 'object') return null;
  const record = details as Record<string, unknown>;
  const amount = parsePayuAmount(record.amt ?? record.amount);
  const status = typeof record.status === 'string' ? record.status.trim().toLowerCase() : '';
  const unmappedStatus =
    typeof record.unmappedstatus === 'string' ? record.unmappedstatus.trim().toLowerCase() : '';
  const payuPaymentId = String(record.mihpayid ?? record.mihpayupid ?? '').trim();
  if (!amount || !/^\d{6,30}$/.test(payuPaymentId) || !status) return null;
  return {
    amount,
    captured: status === 'success' && ['captured', 'settled'].includes(unmappedStatus),
    failed: ['failure', 'failed'].includes(status),
    payuPaymentId,
    status: unmappedStatus || status,
    transactionId,
  };
}
