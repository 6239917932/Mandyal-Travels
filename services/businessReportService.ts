import type { Prisma } from '@/generated/prisma/client';

export const BUSINESS_REPORT_PRODUCTS = ['FLIGHT', 'HOTEL', 'BUS', 'CAR'] as const;
export const BUSINESS_REPORT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'BOOKED'] as const;

export type BusinessReportFilters = {
  from: string;
  product: string;
  search: string;
  status: string;
  to: string;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export function parseBusinessReportFilters(values: {
  from?: string | string[];
  product?: string | string[];
  search?: string | string[];
  status?: string | string[];
  to?: string | string[];
}): BusinessReportFilters {
  const product = getSingleValue(values.product).toUpperCase();
  const status = getSingleValue(values.status).toUpperCase();

  return {
    from: validDate(getSingleValue(values.from)),
    product: BUSINESS_REPORT_PRODUCTS.includes(product as (typeof BUSINESS_REPORT_PRODUCTS)[number])
      ? product
      : '',
    search: getSingleValue(values.search).trim().slice(0, 100),
    status: BUSINESS_REPORT_STATUSES.includes(status as (typeof BUSINESS_REPORT_STATUSES)[number])
      ? status
      : '',
    to: validDate(getSingleValue(values.to)),
  };
}

export function buildBusinessReportWhere(
  organizationId: string,
  filters: BusinessReportFilters,
): Prisma.BusinessTravelRequestWhereInput {
  const where: Prisma.BusinessTravelRequestWhereInput = { organizationId };

  if (filters.product) where.productType = filters.product;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.startDate = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { requester: { is: { email: { contains: filters.search } } } },
      { requester: { is: { firstName: { contains: filters.search } } } },
      { requester: { is: { lastName: { contains: filters.search } } } },
    ];
  }

  return where;
}

export function businessReportSearchParams(filters: BusinessReportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}
