import { createHash } from 'node:crypto';

export const HOTEL_POS_IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;
export const HOTEL_POS_SERVICE_MODES = ['ROOM_SERVICE', 'OUTLET'] as const;
export const HOTEL_GUEST_SERVICE_MODES = ['LAUNDRY', 'MINIBAR', 'SPA'] as const;
export const HOTEL_POS_STATUSES = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'POSTED',
  'CANCELLED',
] as const;

export type HotelPosServiceMode = (typeof HOTEL_POS_SERVICE_MODES)[number];
export type HotelGuestServiceMode = (typeof HOTEL_GUEST_SERVICE_MODES)[number];
export type HotelPosStatus = (typeof HOTEL_POS_STATUSES)[number];
export type HotelPosItem = Readonly<{ name: string; quantity: number; unitPrice: number }>;

export class HotelPosRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function boundedText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function wholeNumber(value: unknown, minimum: number, maximum: number, code: string): number {
  const candidate = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new HotelPosRuleError(code, `Enter a whole number from ${minimum} to ${maximum}.`);
  }
  return candidate;
}

function normalizeHotelServiceOrder(
  input: {
    items?: unknown;
    note?: unknown;
    outletName?: unknown;
    serviceMode?: unknown;
  },
  allowedModes: readonly string[],
) {
  const serviceMode = String(input.serviceMode ?? '')
    .trim()
    .toUpperCase();
  if (!allowedModes.includes(serviceMode)) {
    throw new HotelPosRuleError('INVALID_SERVICE_MODE', 'Choose a valid guest service.');
  }
  const outletName = boundedText(input.outletName, 80);
  if (outletName.length < 2) {
    throw new HotelPosRuleError('INVALID_OUTLET', 'Enter the service desk or outlet name.');
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    throw new HotelPosRuleError('INVALID_ITEMS', 'Add between one and twenty service items.');
  }
  const items = input.items.map((item): HotelPosItem => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new HotelPosRuleError('INVALID_ITEM', 'Enter a valid service item.');
    }
    const record = item as Record<string, unknown>;
    const name = boundedText(record.name, 80);
    if (name.length < 2) {
      throw new HotelPosRuleError('INVALID_ITEM_NAME', 'Each item needs a clear name.');
    }
    return {
      name,
      quantity: wholeNumber(record.quantity, 1, 50, 'INVALID_ITEM_QUANTITY'),
      unitPrice: wholeNumber(record.unitPrice, 1, 500_000, 'INVALID_ITEM_PRICE'),
    };
  });
  const totalAmount = items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  if (!Number.isSafeInteger(totalAmount) || totalAmount > 10_000_000) {
    throw new HotelPosRuleError('INVALID_ORDER_TOTAL', 'The service total exceeds the safe limit.');
  }
  return {
    items,
    note: boundedText(input.note, 240),
    outletName,
    serviceMode,
    totalAmount,
  } as const;
}

export function normalizeHotelPosOrder(input: {
  items?: unknown;
  note?: unknown;
  outletName?: unknown;
  serviceMode?: unknown;
}) {
  try {
    const normalized = normalizeHotelServiceOrder(input, HOTEL_POS_SERVICE_MODES);
    return { ...normalized, serviceMode: normalized.serviceMode as HotelPosServiceMode } as const;
  } catch (error) {
    if (error instanceof HotelPosRuleError && error.code === 'INVALID_SERVICE_MODE') {
      throw new HotelPosRuleError(
        'INVALID_SERVICE_MODE',
        'Choose room service or an outlet order.',
      );
    }
    throw error;
  }
}

export function normalizeHotelGuestServiceOrder(input: {
  items?: unknown;
  note?: unknown;
  outletName?: unknown;
  serviceMode?: unknown;
}) {
  try {
    const normalized = normalizeHotelServiceOrder(input, HOTEL_GUEST_SERVICE_MODES);
    return {
      ...normalized,
      serviceMode: normalized.serviceMode as HotelGuestServiceMode,
    } as const;
  } catch (error) {
    if (error instanceof HotelPosRuleError && error.code === 'INVALID_SERVICE_MODE') {
      throw new HotelPosRuleError(
        'INVALID_SERVICE_MODE',
        'Choose laundry, minibar or spa service.',
      );
    }
    throw error;
  }
}

function normalizeHotelServiceTransition(
  input: {
    currentStatus: string;
    note?: unknown;
    targetStatus?: unknown;
  },
  nextStatuses: readonly HotelPosStatus[],
) {
  const currentStatus = input.currentStatus as HotelPosStatus;
  if (!HOTEL_POS_STATUSES.includes(currentStatus)) {
    throw new HotelPosRuleError('INVALID_ORDER_STATE', 'Refresh this order and try again.');
  }
  const targetStatus = String(input.targetStatus ?? '')
    .trim()
    .toUpperCase() as HotelPosStatus;
  if (!nextStatuses.includes(targetStatus)) {
    throw new HotelPosRuleError(
      'INVALID_ORDER_TRANSITION',
      'This order cannot move to the selected state.',
    );
  }
  const note = boundedText(input.note, 240);
  if (targetStatus === 'CANCELLED' && note.length < 8) {
    throw new HotelPosRuleError(
      'CANCELLATION_REASON_REQUIRED',
      'Enter a cancellation reason of at least eight characters.',
    );
  }
  return { note, targetStatus } as const;
}

export function nextHotelPosStatuses(status: HotelPosStatus): readonly HotelPosStatus[] {
  if (status === 'PLACED') return ['ACCEPTED', 'CANCELLED'];
  if (status === 'ACCEPTED') return ['PREPARING', 'CANCELLED'];
  if (status === 'PREPARING') return ['READY'];
  if (status === 'READY') return ['POSTED'];
  return [];
}

export function normalizeHotelPosTransition(input: {
  currentStatus: string;
  note?: unknown;
  targetStatus?: unknown;
}) {
  const currentStatus = input.currentStatus as HotelPosStatus;
  return normalizeHotelServiceTransition(input, nextHotelPosStatuses(currentStatus));
}

export function nextHotelGuestServiceStatuses(
  serviceMode: HotelGuestServiceMode,
  status: HotelPosStatus,
): readonly HotelPosStatus[] {
  if (status === 'PLACED') return ['ACCEPTED', 'CANCELLED'];
  if (status === 'ACCEPTED') {
    return serviceMode === 'MINIBAR' ? ['POSTED', 'CANCELLED'] : ['PREPARING', 'CANCELLED'];
  }
  if (serviceMode !== 'MINIBAR' && status === 'PREPARING') return ['READY'];
  if (serviceMode !== 'MINIBAR' && status === 'READY') return ['POSTED'];
  return [];
}

export function normalizeHotelGuestServiceTransition(input: {
  currentStatus: string;
  note?: unknown;
  serviceMode: HotelGuestServiceMode;
  targetStatus?: unknown;
}) {
  const currentStatus = input.currentStatus as HotelPosStatus;
  return normalizeHotelServiceTransition(
    input,
    nextHotelGuestServiceStatuses(input.serviceMode, currentStatus),
  );
}

export function requireHotelPosIdempotencyKey(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!HOTEL_POS_IDEMPOTENCY_PATTERN.test(key)) {
    throw new HotelPosRuleError('INVALID_IDEMPOTENCY_KEY', 'Start this order action again.');
  }
  return key;
}

export function hotelPosFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function parseStoredHotelPosItems(value: string): readonly HotelPosItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeHotelPosOrder({
      items: parsed,
      outletName: 'Stored order',
      serviceMode: 'OUTLET',
    }).items;
  } catch {
    return [];
  }
}
