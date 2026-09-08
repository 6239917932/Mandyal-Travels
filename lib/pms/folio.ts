import { createHash } from 'node:crypto';

export const HOTEL_FOLIO_IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;
export const HOTEL_FOLIO_CHARGE_CATEGORIES = [
  'ROOM_SERVICE',
  'FOOD_AND_BEVERAGE',
  'LAUNDRY',
  'MINIBAR',
  'DAMAGE',
  'OTHER',
] as const;
export const HOTEL_FOLIO_PAYMENT_CATEGORIES = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'] as const;

export type HotelFolioEntryType = 'CHARGE' | 'PAYMENT' | 'REVERSAL';
export type HotelFolioChargeCategory = (typeof HOTEL_FOLIO_CHARGE_CATEGORIES)[number];
export type HotelFolioPaymentCategory = (typeof HOTEL_FOLIO_PAYMENT_CATEGORIES)[number];
export type HotelFolioPosting = Readonly<{
  amount: number;
  category: HotelFolioChargeCategory | HotelFolioPaymentCategory;
  description: string;
  entryType: Exclude<HotelFolioEntryType, 'REVERSAL'>;
}>;

export class HotelFolioRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function boundedText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function wholeAmount(value: unknown, allowZero = false): number {
  const candidate = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > 10_000_000) {
    throw new HotelFolioRuleError(
      'INVALID_AMOUNT',
      `Enter a whole INR amount from ${minimum} to 10,000,000.`,
    );
  }
  return candidate;
}

export function normalizeHotelFolioPosting(input: {
  amount?: unknown;
  category?: unknown;
  description?: unknown;
  entryType?: unknown;
}): HotelFolioPosting {
  const entryType = String(input.entryType ?? '')
    .trim()
    .toUpperCase();
  if (entryType !== 'CHARGE' && entryType !== 'PAYMENT') {
    throw new HotelFolioRuleError('INVALID_ENTRY_TYPE', 'Choose a charge or payment posting.');
  }
  const category = String(input.category ?? '')
    .trim()
    .toUpperCase();
  const allowedCategories =
    entryType === 'CHARGE' ? HOTEL_FOLIO_CHARGE_CATEGORIES : HOTEL_FOLIO_PAYMENT_CATEGORIES;
  if (!allowedCategories.some((value) => value === category)) {
    throw new HotelFolioRuleError('INVALID_CATEGORY', 'Choose a valid folio category.');
  }
  const description = boundedText(input.description, 160);
  if (description.length < 3) {
    throw new HotelFolioRuleError(
      'INVALID_DESCRIPTION',
      'Enter a short description of at least three characters.',
    );
  }
  return {
    amount: wholeAmount(input.amount),
    category: category as HotelFolioPosting['category'],
    description,
    entryType,
  };
}

export function normalizeCashierOpeningAmount(value: unknown): number {
  return wholeAmount(value, true);
}

export function normalizeCashierClosingAmount(value: unknown): number {
  return wholeAmount(value, true);
}

export function normalizeFolioReversalReason(value: unknown): string {
  const reason = boundedText(value, 240);
  if (reason.length < 8) {
    throw new HotelFolioRuleError(
      'INVALID_REVERSAL_REASON',
      'Enter a reversal reason of at least eight characters.',
    );
  }
  return reason;
}

export function requireHotelFolioIdempotencyKey(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!HOTEL_FOLIO_IDEMPOTENCY_PATTERN.test(key)) {
    throw new HotelFolioRuleError(
      'INVALID_IDEMPOTENCY_KEY',
      'Start this cashier action again and retry.',
    );
  }
  return key;
}

export function hotelFolioRequestFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export type HotelFolioBalanceEntry = Readonly<{
  amount: number;
  entryType: HotelFolioEntryType;
  reversalOfType?: Exclude<HotelFolioEntryType, 'REVERSAL'>;
}>;

export function calculateHotelFolioBalance(input: {
  bookingTotalAmount: number;
  entries: readonly HotelFolioBalanceEntry[];
  onlinePayment?: { amount: number; status: string } | null;
  onlineRefunds?: readonly { amount: number; status: string }[];
}) {
  let charges = input.bookingTotalAmount;
  let payments =
    input.onlinePayment?.status.toLowerCase() === 'captured' ? input.onlinePayment.amount : 0;
  const approvedRefunds = (input.onlineRefunds ?? []).reduce(
    (total, refund) =>
      refund.status.toUpperCase() === 'APPROVED' &&
      Number.isSafeInteger(refund.amount) &&
      refund.amount > 0
        ? total + refund.amount
        : total,
    0,
  );
  payments = Math.max(0, payments - approvedRefunds);
  for (const entry of input.entries) {
    if (!Number.isSafeInteger(entry.amount) || entry.amount < 0) continue;
    if (entry.entryType === 'CHARGE') charges += entry.amount;
    if (entry.entryType === 'PAYMENT') payments += entry.amount;
    if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'CHARGE') {
      charges -= entry.amount;
    }
    if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'PAYMENT') {
      payments -= entry.amount;
    }
  }
  return {
    approvedRefunds,
    balance: charges - payments,
    charges,
    payments,
  } as const;
}

export function calculateExpectedCash(input: {
  entries: readonly (HotelFolioBalanceEntry & { category: string })[];
  openingFloatAmount: number;
}): number {
  return input.entries.reduce((total, entry) => {
    if (entry.category !== 'CASH') return total;
    if (entry.entryType === 'PAYMENT') return total + entry.amount;
    if (entry.entryType === 'REVERSAL' && entry.reversalOfType === 'PAYMENT') {
      return total - entry.amount;
    }
    return total;
  }, input.openingFloatAmount);
}
