import type { BusResultControls } from '@/types/bus';

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const bounded = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length <= 100 ? normalized : undefined;
};

export function createBusResultControls(params: Record<string, string | string[] | undefined>): BusResultControls {
  const maximumTotalPrice = Number(first(params.maximumTotalPrice));
  const sort = first(params.sort);
  return {
    busType: bounded(first(params.busType)),
    maximumTotalPrice: Number.isFinite(maximumTotalPrice) && maximumTotalPrice > 0 && maximumTotalPrice <= 10_000_000 ? maximumTotalPrice : undefined,
    operator: bounded(first(params.operator)),
    refundableOnly: first(params.refundableOnly) === 'true',
    sort: sort === 'duration-ascending' || sort === 'departure-ascending' || sort === 'rating-descending' ? sort : 'price-ascending',
  };
}
