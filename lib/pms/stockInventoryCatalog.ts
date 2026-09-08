export const HOTEL_STOCK_CATEGORIES = [
  'HOUSEKEEPING',
  'LINEN',
  'MINIBAR',
  'KITCHEN',
  'MAINTENANCE',
  'OFFICE',
] as const;

export const HOTEL_STOCK_UNITS = ['ITEM', 'BOTTLE', 'PACK', 'KILOGRAM', 'LITRE'] as const;

export const HOTEL_STOCK_MOVEMENTS = [
  'RECEIPT',
  'ISSUE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
] as const;
