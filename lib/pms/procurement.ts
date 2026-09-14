import { createHash } from 'node:crypto';

export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
] as const;

const MAX_DB_INTEGER = 2_147_483_647;
const clean = (value: unknown, maximum: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
const integer = (value: unknown, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
};
const isoDate = (value: unknown) => {
  const result = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) return '';
  const date = new Date(`${result}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== result ? '' : result;
};
const operationalToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  }).format(new Date());
const moneyMinor = (value: unknown) => {
  const text = clean(value, 20);
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result > 0 && result <= MAX_DB_INTEGER ? result : null;
};
const taxBasisPoints = (value: unknown) => {
  const text = clean(value, 8);
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return result >= 0 && result <= 10_000 ? result : null;
};

export function normalizePurchaseOrder(input: Record<string, unknown>) {
  const propertyId = clean(input.propertyId, 100);
  const vendorId = clean(input.vendorId, 100);
  const purchaseOrderNumber = clean(input.purchaseOrderNumber, 40)
    .toUpperCase()
    .replace(/[^A-Z0-9._/-]/g, '');
  const orderDate = isoDate(input.orderDate);
  const expectedDeliveryDate = isoDate(input.expectedDeliveryDate);
  const today = operationalToday();
  const note = clean(input.note, 500);
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (
    !propertyId ||
    !vendorId ||
    purchaseOrderNumber.length < 3 ||
    !orderDate ||
    orderDate > today ||
    !expectedDeliveryDate ||
    expectedDeliveryDate < orderDate ||
    rawLines.length < 1 ||
    rawLines.length > 50
  )
    return null;

  const lines = rawLines.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const line = raw as Record<string, unknown>;
    const stockItemId = clean(line.stockItemId, 100);
    const quantityOrdered = integer(line.quantityOrdered, 1, 1_000_000);
    const unitPriceMinor = moneyMinor(line.unitPrice);
    const taxRateBasisPoints = taxBasisPoints(line.taxRatePercent);
    if (
      !stockItemId ||
      quantityOrdered === null ||
      unitPriceMinor === null ||
      taxRateBasisPoints === null
    )
      return null;
    const lineSubtotalMinor = quantityOrdered * unitPriceMinor;
    const lineTaxMinor = Math.round((lineSubtotalMinor * taxRateBasisPoints) / 10_000);
    const lineTotalMinor = lineSubtotalMinor + lineTaxMinor;
    if (lineTotalMinor > MAX_DB_INTEGER) return null;
    return {
      lineSubtotalMinor,
      lineTaxMinor,
      lineTotalMinor,
      quantityOrdered,
      stockItemId,
      taxRateBasisPoints,
      unitPriceMinor,
    };
  });
  if (lines.some((line) => !line)) return null;
  const validLines = lines.filter((line): line is NonNullable<typeof line> => Boolean(line));
  if (new Set(validLines.map((line) => line.stockItemId)).size !== validLines.length) return null;
  const subtotalMinor = validLines.reduce((sum, line) => sum + line.lineSubtotalMinor, 0);
  const taxMinor = validLines.reduce((sum, line) => sum + line.lineTaxMinor, 0);
  const totalMinor = subtotalMinor + taxMinor;
  if (totalMinor > MAX_DB_INTEGER) return null;
  return {
    expectedDeliveryDate,
    lines: validLines,
    note,
    orderDate,
    propertyId,
    purchaseOrderNumber,
    subtotalMinor,
    taxMinor,
    totalMinor,
    vendorId,
  };
}

export function normalizePurchaseOrderAction(input: Record<string, unknown>) {
  const purchaseOrderId = clean(input.purchaseOrderId, 100);
  const action = clean(input.action, 20).toUpperCase();
  const expectedVersion = integer(input.expectedVersion, 1, 1_000_000);
  const note = clean(input.note, 500);
  if (
    !purchaseOrderId ||
    !['SUBMIT', 'APPROVE', 'CANCEL'].includes(action) ||
    expectedVersion === null ||
    note.length < 5
  )
    return null;
  return { action, expectedVersion, note, purchaseOrderId };
}

export function nextPurchaseOrderStatus(status: string, action: string) {
  if (status === 'DRAFT' && action === 'SUBMIT') return 'SUBMITTED';
  if (status === 'SUBMITTED' && action === 'APPROVE') return 'APPROVED';
  if (['DRAFT', 'SUBMITTED'].includes(status) && action === 'CANCEL') return 'CANCELLED';
  return null;
}

export function normalizeGoodsReceipt(input: Record<string, unknown>) {
  const purchaseOrderLineId = clean(input.purchaseOrderLineId, 100);
  const expectedOrderVersion = integer(input.expectedOrderVersion, 1, 1_000_000);
  const expectedStockVersion = integer(input.expectedStockVersion, 1, 1_000_000);
  const quantity = integer(input.quantity, 1, 1_000_000);
  const deliveryReference = clean(input.deliveryReference, 100);
  const receivedOn = isoDate(input.receivedOn);
  const today = operationalToday();
  const note = clean(input.note, 500);
  if (
    !purchaseOrderLineId ||
    expectedOrderVersion === null ||
    expectedStockVersion === null ||
    quantity === null ||
    deliveryReference.length < 3 ||
    !receivedOn ||
    receivedOn > today ||
    note.length < 5
  )
    return null;
  return {
    deliveryReference,
    expectedOrderVersion,
    expectedStockVersion,
    note,
    purchaseOrderLineId,
    quantity,
    receivedOn,
  };
}

export function procurementRequestFingerprint(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
