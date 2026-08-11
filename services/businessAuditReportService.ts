import type { Prisma } from '@/generated/prisma/client';
import { BUSINESS_AUDIT_ACTIONS } from '@/services/businessAuditService';

export const BUSINESS_AUDIT_FILTER_ACTIONS: string[] = Object.values(BUSINESS_AUDIT_ACTIONS).sort();

export type BusinessAuditFilters = {
  action: string;
  from: string;
  search: string;
  to: string;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

export function parseBusinessAuditFilters(values: {
  action?: string | string[];
  from?: string | string[];
  search?: string | string[];
  to?: string | string[];
}): BusinessAuditFilters {
  const action = getSingleValue(values.action).toUpperCase();

  return {
    action: BUSINESS_AUDIT_FILTER_ACTIONS.includes(action) ? action : '',
    from: validDate(getSingleValue(values.from)),
    search: getSingleValue(values.search).trim().slice(0, 100),
    to: validDate(getSingleValue(values.to)),
  };
}

export function buildBusinessAuditWhere(
  organizationId: string,
  filters: BusinessAuditFilters,
): Prisma.BusinessAuditLogWhereInput {
  const where: Prisma.BusinessAuditLogWhereInput = { organizationId };

  if (filters.action) where.action = filters.action;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { summary: { contains: filters.search } },
      { entityType: { contains: filters.search } },
      { entityId: { contains: filters.search } },
      { actor: { is: { email: { contains: filters.search } } } },
      { actor: { is: { firstName: { contains: filters.search } } } },
      { actor: { is: { lastName: { contains: filters.search } } } },
    ];
  }

  return where;
}

export function businessAuditSearchParams(filters: BusinessAuditFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}
