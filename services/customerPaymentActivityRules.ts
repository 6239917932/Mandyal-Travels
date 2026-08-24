import type {
  CustomerHotelBookingStatus,
  CustomerPaymentStatus,
  CustomerRefundStatus,
} from '../types/customerPaymentActivity.ts';

export const CUSTOMER_PAYMENT_PAGE_SIZE = 15;
export const CUSTOMER_PAYMENT_MAX_PAGES = 20;
export const CUSTOMER_PAYMENT_MAX_RESULTS = CUSTOMER_PAYMENT_PAGE_SIZE * CUSTOMER_PAYMENT_MAX_PAGES;
export const CUSTOMER_PAYMENT_REFUNDS_PER_PAYMENT = 5;

export function normalizeCustomerPaymentPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, CUSTOMER_PAYMENT_MAX_PAGES);
}

export function customerPaymentStatus(value: string): CustomerPaymentStatus {
  switch (value.trim().toLowerCase()) {
    case 'captured':
    case 'paid':
      return 'PAID';
    case 'pending':
    case 'processing':
      return 'PROCESSING';
    case 'failed':
    case 'declined':
      return 'UNSUCCESSFUL';
    case 'refunded':
      return 'REFUNDED';
    default:
      return 'UNDER_REVIEW';
  }
}

export function customerHotelBookingStatus(value: string): CustomerHotelBookingStatus {
  switch (value.trim().toLowerCase()) {
    case 'confirmed':
      return 'CONFIRMED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    case 'pending':
    case 'processing':
      return 'PROCESSING';
    default:
      return 'UNDER_REVIEW';
  }
}

export function customerRefundStatus(value: string): CustomerRefundStatus {
  switch (value.trim().toUpperCase()) {
    case 'PENDING':
      return 'REQUEST_RECEIVED';
    case 'PROCESSING':
      return 'PROCESSING';
    case 'APPROVED':
    case 'COMPLETED':
      return 'COMPLETED';
    case 'REJECTED':
      return 'NOT_APPROVED';
    case 'PROVIDER_FAILED':
      return 'DELAYED';
    default:
      return 'UNDER_REVIEW';
  }
}
