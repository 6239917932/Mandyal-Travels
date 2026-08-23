export const ADMIN_SUPPORT_PAGE_SIZE = 20;

export type AdminSupportQueueType = 'BUSINESS' | 'CUSTOMER';
export type AdminSupportQueueStatus = 'ALL' | 'CLOSED' | 'OPEN';

export type AdminSupportQueueFilters = {
  page: number;
  query: string;
  status: AdminSupportQueueStatus;
  type: AdminSupportQueueType;
};

type RawAdminSupportQueueFilters = {
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
  type?: string | string[];
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeAdminSupportQueueFilters(
  input: RawAdminSupportQueueFilters,
): AdminSupportQueueFilters {
  const parsedPage = Number(firstValue(input.page));
  const rawStatus = firstValue(input.status)?.toUpperCase();
  const rawType = firstValue(input.type)?.toUpperCase();

  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    query: (firstValue(input.q) ?? '').trim().slice(0, 100),
    status:
      rawStatus === 'ALL' || rawStatus === 'CLOSED' || rawStatus === 'OPEN' ? rawStatus : 'OPEN',
    type: rawType === 'BUSINESS' ? 'BUSINESS' : 'CUSTOMER',
  };
}

export function adminSupportQueuePath(
  filters: AdminSupportQueueFilters,
  page = filters.page,
): string {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    status: filters.status,
    type: filters.type,
  });
  if (filters.query) params.set('q', filters.query);
  return `/admin/support?${params.toString()}`;
}
