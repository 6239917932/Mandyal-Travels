import { createHash } from 'node:crypto';

import { HOTEL_FIXED_ASSET_CATEGORIES, HOTEL_FIXED_ASSET_EVENTS } from './fixedAssetCatalog.ts';
import { isIsoCalendarDate } from './operationalDate.ts';

export { HOTEL_FIXED_ASSET_CATEGORIES, HOTEL_FIXED_ASSET_EVENTS };

const clean = (value: unknown, maximum: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : '';

const MONEY = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/;
const MAX_DATABASE_INTEGER = 2_147_483_647;

function rupeesToMinor(value: unknown) {
  const normalized = clean(value, 14);
  const match = MONEY.exec(normalized);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? '').padEnd(2, '0'));
  const total = rupees * 100 + paise;
  return Number.isSafeInteger(total) && total > 0 && total <= MAX_DATABASE_INTEGER ? total : null;
}

function version(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeFixedAsset(input: Record<string, unknown>) {
  const assetTag = clean(input.assetTag, 40)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '');
  const name = clean(input.name, 120);
  const category = clean(input.category, 30).toUpperCase();
  const location = clean(input.location, 120);
  const custodian = clean(input.custodian, 120);
  const acquiredOn = clean(input.acquiredOn, 10);
  const acquisitionCostMinor = rupeesToMinor(input.acquisitionCost);
  const invoiceReference = clean(input.invoiceReference, 100);
  if (
    assetTag.length < 2 ||
    name.length < 2 ||
    !HOTEL_FIXED_ASSET_CATEGORIES.includes(
      category as (typeof HOTEL_FIXED_ASSET_CATEGORIES)[number],
    ) ||
    location.length < 2 ||
    !isIsoCalendarDate(acquiredOn) ||
    acquisitionCostMinor === null ||
    invoiceReference.length < 2
  ) {
    return null;
  }
  return {
    acquiredOn,
    acquisitionCostMinor,
    assetTag,
    category,
    custodian,
    invoiceReference,
    location,
    name,
  };
}

export function normalizeFixedAssetEvent(input: Record<string, unknown>) {
  const assetId = clean(input.assetId, 100);
  const eventType = clean(input.eventType, 20).toUpperCase();
  const expectedVersion = version(input.expectedVersion);
  const note = clean(input.note, 300);
  const location = clean(input.location, 120);
  const custodian = clean(input.custodian, 120);
  if (
    !assetId ||
    !HOTEL_FIXED_ASSET_EVENTS.includes(eventType as (typeof HOTEL_FIXED_ASSET_EVENTS)[number]) ||
    expectedVersion === null ||
    note.length < 5 ||
    (eventType === 'MOVED' && location.length < 2)
  ) {
    return null;
  }
  return { assetId, custodian, eventType, expectedVersion, location, note };
}

export function fixedAssetRequestFingerprint(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}
