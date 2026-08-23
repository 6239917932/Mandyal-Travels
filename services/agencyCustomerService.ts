import { isValidEmail, normalizeEmail } from '../lib/auth/validation.ts';

export const AGENCY_CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type AgencyCustomerStatus = (typeof AGENCY_CUSTOMER_STATUSES)[number];

type AgencyCustomerInput = {
  displayName: string;
  email: string;
  notes: string;
  phone: string;
  status: AgencyCustomerStatus;
};

type AgencyCustomerInputResult =
  { error: string; ok: false } | { ok: true; value: AgencyCustomerInput };

function readText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length <= maximumLength ? text : '';
}

export function parseAgencyCustomerInput(
  body: Record<string, unknown>,
  defaultStatus: AgencyCustomerStatus = 'ACTIVE',
): AgencyCustomerInputResult {
  const displayName = readText(body.displayName, 120);
  const email = normalizeEmail(readText(body.email, 254));
  const phone = readText(body.phone, 30);
  const notes = readText(body.notes, 500);
  const requestedStatus = readText(body.status, 20).toUpperCase() || defaultStatus;

  if (displayName.length < 2 || !isValidEmail(email)) {
    return { error: 'Enter a valid customer name and email.', ok: false };
  }
  if (!AGENCY_CUSTOMER_STATUSES.some((status) => status === requestedStatus)) {
    return { error: 'Select a valid customer status.', ok: false };
  }

  return {
    ok: true,
    value: {
      displayName,
      email,
      notes,
      phone,
      status: requestedStatus as AgencyCustomerStatus,
    },
  };
}
