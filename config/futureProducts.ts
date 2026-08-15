export const FUTURE_PRODUCT_MODULES = [
  { code: 'TRAINS', status: 'PLANNED', requiresProvider: true },
  { code: 'VISA', status: 'PLANNED', requiresProvider: true },
  { code: 'INSURANCE', status: 'PLANNED', requiresProvider: true },
  { code: 'ACTIVITIES', status: 'PLANNED', requiresProvider: true },
  { code: 'TRANSFERS', status: 'PLANNED', requiresProvider: true },
] as const;

export type FutureProductCode = (typeof FUTURE_PRODUCT_MODULES)[number]['code'];

export function isFutureProductCode(value: string): value is FutureProductCode {
  return FUTURE_PRODUCT_MODULES.some((product) => product.code === value);
}
