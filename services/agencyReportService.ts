import type { Prisma } from '@/generated/prisma/client';

export const AGENCY_REPORT_PRODUCTS = ['FLIGHT', 'HOTEL', 'BUS', 'CAR'] as const;
export const AGENCY_REPORT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'BOOKED'] as const;

export type AgencyReportFilters = {
  customer: string;
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

export function parseAgencyReportFilters(values: {
  customer?: string | string[];
  from?: string | string[];
  product?: string | string[];
  search?: string | string[];
  status?: string | string[];
  to?: string | string[];
}): AgencyReportFilters {
  const product = getSingleValue(values.product).toUpperCase();
  const status = getSingleValue(values.status).toUpperCase();

  return {
    customer: getSingleValue(values.customer).trim().slice(0, 64),
    from: validDate(getSingleValue(values.from)),
    product: AGENCY_REPORT_PRODUCTS.includes(product as (typeof AGENCY_REPORT_PRODUCTS)[number])
      ? product
      : '',
    search: getSingleValue(values.search).trim().slice(0, 100),
    status: AGENCY_REPORT_STATUSES.includes(status as (typeof AGENCY_REPORT_STATUSES)[number])
      ? status
      : '',
    to: validDate(getSingleValue(values.to)),
  };
}

export function buildAgencyReportWhere(
  organizationId: string,
  filters: AgencyReportFilters,
): Prisma.BusinessTravelRequestWhereInput {
  const customerWhere: Prisma.AgencyCustomerWhereInput = { organizationId };
  if (filters.customer) customerWhere.id = filters.customer;

  const where: Prisma.BusinessTravelRequestWhereInput = {
    agencyCustomerLink: { is: { agencyCustomer: { is: customerWhere } } },
    organizationId,
  };

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
      {
        agencyCustomerLink: {
          is: { agencyCustomer: { is: { displayName: { contains: filters.search } } } },
        },
      },
      {
        agencyCustomerLink: {
          is: { agencyCustomer: { is: { email: { contains: filters.search } } } },
        },
      },
      {
        agencyCustomerLink: {
          is: { agencyCustomer: { is: { phone: { contains: filters.search } } } },
        },
      },
    ];
  }

  return where;
}

export function agencyReportSearchParams(filters: AgencyReportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}
