import { HotelFolioRuleError } from './folio.ts';

export const HOTEL_SPLIT_PAYMENT_CATEGORIES = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'] as const;

export type HotelSplitPaymentCategory = (typeof HOTEL_SPLIT_PAYMENT_CATEGORIES)[number];

export type HotelSplitPaymentAllocation = Readonly<{
  amount: number;
  category: HotelSplitPaymentCategory;
  payer: string;
}>;

function boundedText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function wholeAmount(value: unknown, maximum = 10_000_000): number {
  const candidate = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isSafeInteger(candidate) || candidate < 1 || candidate > maximum) {
    throw new HotelFolioRuleError(
      'INVALID_AMOUNT',
      `Enter a whole INR amount from 1 to ${maximum.toLocaleString('en-IN')}.`,
    );
  }
  return candidate;
}

export function normalizeHotelFolioDiscount(input: { amount?: unknown; reason?: unknown }) {
  const reason = boundedText(input.reason, 160);
  if (reason.length < 8) {
    throw new HotelFolioRuleError(
      'INVALID_DISCOUNT_REASON',
      'Enter a discount reason of at least eight characters.',
    );
  }
  return { amount: wholeAmount(input.amount), reason } as const;
}

export function normalizeHotelSplitPaymentAllocations(value: unknown) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
    throw new HotelFolioRuleError(
      'INVALID_SPLIT_ALLOCATIONS',
      'Divide the balance between two to four payers.',
    );
  }
  return value.map((candidate, index): HotelSplitPaymentAllocation => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new HotelFolioRuleError(
        'INVALID_SPLIT_ALLOCATIONS',
        `Enter valid details for payer ${index + 1}.`,
      );
    }
    const input = candidate as Record<string, unknown>;
    const payer = boundedText(input.payer, 80);
    if (payer.length < 2) {
      throw new HotelFolioRuleError(
        'INVALID_PAYER',
        `Enter a payer name of at least two characters for allocation ${index + 1}.`,
      );
    }
    const category = String(input.category ?? '')
      .trim()
      .toUpperCase();
    if (!HOTEL_SPLIT_PAYMENT_CATEGORIES.some((allowed) => allowed === category)) {
      throw new HotelFolioRuleError(
        'INVALID_PAYMENT_MODE',
        `Choose a valid payment mode for ${payer}.`,
      );
    }
    return {
      amount: wholeAmount(input.amount),
      category: category as HotelSplitPaymentCategory,
      payer,
    };
  });
}

export function requireExpectedFolioBalance(value: unknown): number {
  return wholeAmount(value);
}
