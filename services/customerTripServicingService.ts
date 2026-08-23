const SUPPORT_CATEGORIES = new Set(['ACCOUNT', 'BOOKING', 'PAYMENT', 'TECHNICAL', 'OTHER']);
const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{4,40}$/i;

type SearchValue = string | string[] | undefined;

export type CustomerSupportPrefill = {
  bookingReference: string;
  category: string;
  message: string;
  subject: string;
};

function firstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedValue(value: SearchValue, maximumLength: number) {
  return (firstValue(value) ?? '').trim().slice(0, maximumLength);
}

export function normalizeCustomerSupportPrefill(values: {
  bookingReference?: SearchValue;
  category?: SearchValue;
  message?: SearchValue;
  subject?: SearchValue;
}): CustomerSupportPrefill {
  const category = boundedValue(values.category, 20).toUpperCase();
  const bookingReference = boundedValue(values.bookingReference, 40).toUpperCase();

  return {
    bookingReference: BOOKING_REFERENCE_PATTERN.test(bookingReference) ? bookingReference : '',
    category: SUPPORT_CATEGORIES.has(category) ? category : 'BOOKING',
    message: boundedValue(values.message, 2000),
    subject: boundedValue(values.subject, 120),
  };
}

export function customerTripServicingPath(trip: { confirmationCode: string; productType: string }) {
  const product = trip.productType.trim().toUpperCase();
  const reference = trip.confirmationCode.trim().toUpperCase();
  const query = new URLSearchParams({
    bookingReference: reference,
    category: 'BOOKING',
    message:
      'Please review this booking and contact me about the change or cancellation I describe below. I understand this request does not automatically change or cancel my booking and does not guarantee a refund.\n\nRequested help: ',
    subject: `Servicing request for ${product} ${reference}`,
  });

  return `/account/support?${query.toString()}`;
}
