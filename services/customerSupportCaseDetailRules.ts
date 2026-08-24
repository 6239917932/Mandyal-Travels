export const CUSTOMER_SUPPORT_TIMELINE_LIMIT = 100;

const CUSTOMER_SUPPORT_CASE_NUMBER_PATTERN = /^MTCC-\d{8}-[0-9A-F]{8}$/;

export function normalizeCustomerSupportCaseNumber(value: string) {
  const normalized = value.trim().toUpperCase();
  return CUSTOMER_SUPPORT_CASE_NUMBER_PATTERN.test(normalized) ? normalized : null;
}

export function customerSupportCategoryLabel(category: string) {
  switch (category) {
    case 'ACCOUNT':
      return 'Account';
    case 'BOOKING':
      return 'Booking';
    case 'PAYMENT':
      return 'Payment';
    case 'TECHNICAL':
      return 'Technical';
    case 'OTHER':
      return 'Other';
    default:
      return 'General support';
  }
}

export function customerSupportStatusLabel(status: string) {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'CLOSED':
      return 'Closed';
    default:
      return 'Under review';
  }
}

export function customerSupportEventLabel(action: string) {
  switch (action) {
    case 'CREATED':
      return 'Case created';
    case 'CLOSED':
      return 'Case closed';
    case 'REOPENED':
      return 'Case reopened';
    default:
      return 'Update recorded';
  }
}
