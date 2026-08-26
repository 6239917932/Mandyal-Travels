export const TRANSPORT_SERVICING_PRODUCTS = ['FLIGHT', 'BUS', 'CAR'] as const;
export type TransportServicingProduct = (typeof TRANSPORT_SERVICING_PRODUCTS)[number];

export const TRANSPORT_SERVICING_REQUEST_TYPES = ['CHANGE', 'CANCEL'] as const;
export type TransportServicingRequestType = (typeof TRANSPORT_SERVICING_REQUEST_TYPES)[number];

export const TRANSPORT_SERVICING_STATUSES = [
  'REQUESTED',
  'VALIDATED',
  'AWAITING_SUPPLIER',
  'APPROVED',
  'REJECTED',
  'TIMED_OUT',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'WITHDRAWN',
] as const;
export type TransportServicingStatus = (typeof TRANSPORT_SERVICING_STATUSES)[number];

export type TransportSupplierAcknowledgement =
  'ACKNOWLEDGED' | 'NOT_REQUIRED' | 'NOT_SENT' | 'PENDING' | 'REJECTED' | 'TIMED_OUT';
export type TransportRefundLinkage =
  | 'NOT_APPLICABLE'
  | 'NOT_REQUIRED'
  | 'PENDING_DETERMINATION'
  | 'REQUIRED_LINKED'
  | 'REQUIRED_UNLINKED'
  | 'COMPLETED';
export type TransportServicingReconciliation =
  'DISCREPANCY' | 'MANUAL_REVIEW' | 'MATCHED' | 'NOT_APPLICABLE' | 'PENDING' | 'RESOLVED';

export type TransportServicingActorRole =
  | 'CUSTOMER'
  | 'FINANCE_REVIEWER'
  | 'PLATFORM_ADMIN'
  | 'SUPPLIER_OPERATOR'
  | 'SUPPORT_AGENT'
  | 'SYSTEM';
export type TransportServicingAction =
  | 'ACKNOWLEDGE'
  | 'COMPLETE'
  | 'CREATE'
  | 'DECLINE'
  | 'FAIL'
  | 'LINK_REFUND'
  | 'MARK_RECONCILIATION'
  | 'START_PROCESSING'
  | 'SUBMIT_TO_SUPPLIER'
  | 'SUPPLIER_REJECT'
  | 'TIME_OUT'
  | 'VALIDATE'
  | 'WITHDRAW';

export interface TransportServicingFinancialState {
  reconciliationStatus: TransportServicingReconciliation;
  refundLinkage: TransportRefundLinkage;
  refundRequestId: string | null;
}

export interface TransportServicingTransitionEvent {
  readonly action: TransportServicingAction;
  readonly actorUserId: string;
  readonly fromStatus: TransportServicingStatus;
  readonly idempotencyKey: string;
  readonly nextVersion: number;
  readonly occurredAt: string;
  readonly reason: string;
  readonly supplierAcknowledgement: TransportSupplierAcknowledgement;
  readonly toStatus: TransportServicingStatus;
}

export type TransportServicingRuleResult<T> =
  { ok: true; value: T } | { errors: readonly string[]; ok: false };

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const BOOKING_REFERENCE_PATTERN = /^[A-Z0-9-]{4,40}$/;
const IDEMPOTENCY_KEY_PATTERN = /^tsr_[a-z0-9][a-z0-9_-]{14,118}$/;
const MAX_VERSION = 10_000;
const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1_000;
const MIN_SUPPLIER_TIMEOUT_MINUTES = 5;
const MAX_SUPPLIER_TIMEOUT_MINUTES = 7 * 24 * 60;

const ACTION_PERMISSIONS: Record<TransportServicingAction, readonly TransportServicingActorRole[]> =
  {
    ACKNOWLEDGE: ['PLATFORM_ADMIN', 'SUPPLIER_OPERATOR', 'SYSTEM'],
    COMPLETE: ['PLATFORM_ADMIN', 'SUPPORT_AGENT', 'SYSTEM'],
    CREATE: ['CUSTOMER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT'],
    DECLINE: ['PLATFORM_ADMIN', 'SUPPORT_AGENT'],
    FAIL: ['PLATFORM_ADMIN', 'SUPPORT_AGENT', 'SYSTEM'],
    LINK_REFUND: ['FINANCE_REVIEWER', 'PLATFORM_ADMIN'],
    MARK_RECONCILIATION: ['FINANCE_REVIEWER', 'PLATFORM_ADMIN', 'SYSTEM'],
    START_PROCESSING: ['PLATFORM_ADMIN', 'SUPPORT_AGENT', 'SYSTEM'],
    SUBMIT_TO_SUPPLIER: ['PLATFORM_ADMIN', 'SUPPORT_AGENT', 'SYSTEM'],
    SUPPLIER_REJECT: ['PLATFORM_ADMIN', 'SUPPLIER_OPERATOR', 'SYSTEM'],
    TIME_OUT: ['PLATFORM_ADMIN', 'SYSTEM'],
    VALIDATE: ['PLATFORM_ADMIN', 'SUPPORT_AGENT'],
    WITHDRAW: ['CUSTOMER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT'],
  };

const TRANSITIONS: Record<
  TransportServicingStatus,
  Partial<Record<TransportServicingAction, TransportServicingStatus>>
> = {
  APPROVED: { START_PROCESSING: 'PROCESSING' },
  AWAITING_SUPPLIER: {
    ACKNOWLEDGE: 'APPROVED',
    SUPPLIER_REJECT: 'REJECTED',
    TIME_OUT: 'TIMED_OUT',
    WITHDRAW: 'WITHDRAWN',
  },
  COMPLETED: {},
  FAILED: { START_PROCESSING: 'PROCESSING' },
  PROCESSING: { COMPLETE: 'COMPLETED', FAIL: 'FAILED' },
  REJECTED: {},
  REQUESTED: { DECLINE: 'REJECTED', VALIDATE: 'VALIDATED', WITHDRAW: 'WITHDRAWN' },
  TIMED_OUT: { DECLINE: 'REJECTED', SUBMIT_TO_SUPPLIER: 'AWAITING_SUPPLIER' },
  VALIDATED: {
    DECLINE: 'REJECTED',
    SUBMIT_TO_SUPPLIER: 'AWAITING_SUPPLIER',
    WITHDRAW: 'WITHDRAWN',
  },
  WITHDRAWN: {},
};

function isIsoInstant(value: string): boolean {
  const parsed = new Date(value);
  return (
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString() === value
  );
}

function boundedText(value: string, maximum: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maximum);
}

export function isTransportServicingActionAllowed(
  action: TransportServicingAction,
  actorRole: TransportServicingActorRole,
): boolean {
  return ACTION_PERMISSIONS[action].includes(actorRole);
}

export function normalizeTransportServicingIdempotencyKey(value: unknown): string | null {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return IDEMPOTENCY_KEY_PATTERN.test(key) ? key : null;
}

export function normalizeTransportServicingRequest(input: {
  bookingReference: unknown;
  customerUserId: unknown;
  idempotencyKey: unknown;
  productType: unknown;
  requestSummary: unknown;
  requestType: unknown;
}): {
  bookingReference: string;
  customerUserId: string;
  idempotencyKey: string;
  productType: TransportServicingProduct;
  requestSummary: string;
  requestType: TransportServicingRequestType;
} | null {
  const bookingReference =
    typeof input.bookingReference === 'string' ? input.bookingReference.trim().toUpperCase() : '';
  const customerUserId =
    typeof input.customerUserId === 'string' ? input.customerUserId.trim() : '';
  const idempotencyKey = normalizeTransportServicingIdempotencyKey(input.idempotencyKey);
  const productType =
    typeof input.productType === 'string' ? input.productType.trim().toUpperCase() : '';
  const requestType =
    typeof input.requestType === 'string' ? input.requestType.trim().toUpperCase() : '';
  const requestSummary =
    typeof input.requestSummary === 'string' ? boundedText(input.requestSummary, 1_000) : '';
  if (
    !BOOKING_REFERENCE_PATTERN.test(bookingReference) ||
    !SAFE_ID_PATTERN.test(customerUserId) ||
    !idempotencyKey ||
    !(TRANSPORT_SERVICING_PRODUCTS as readonly string[]).includes(productType) ||
    !(TRANSPORT_SERVICING_REQUEST_TYPES as readonly string[]).includes(requestType) ||
    requestSummary.length < 10
  ) {
    return null;
  }
  return {
    bookingReference,
    customerUserId,
    idempotencyKey,
    productType: productType as TransportServicingProduct,
    requestSummary,
    requestType: requestType as TransportServicingRequestType,
  };
}

export function transportServicingIdempotencyDecision(
  existing: ReturnType<typeof normalizeTransportServicingRequest>,
  requested: ReturnType<typeof normalizeTransportServicingRequest>,
): 'CONFLICT' | 'NEW' | 'REPLAY' {
  if (!requested) return 'CONFLICT';
  if (!existing) return 'NEW';
  if (existing.idempotencyKey !== requested.idempotencyKey) return 'NEW';
  return existing.bookingReference === requested.bookingReference &&
    existing.customerUserId === requested.customerUserId &&
    existing.productType === requested.productType &&
    existing.requestType === requested.requestType &&
    existing.requestSummary === requested.requestSummary
    ? 'REPLAY'
    : 'CONFLICT';
}

export function supplierAcknowledgementTimedOut(input: {
  acknowledgement: TransportSupplierAcknowledgement;
  now: string;
  sentAt: string;
  timeoutMinutes: number;
}): boolean {
  if (
    input.acknowledgement !== 'PENDING' ||
    !isIsoInstant(input.now) ||
    !isIsoInstant(input.sentAt) ||
    !Number.isInteger(input.timeoutMinutes) ||
    input.timeoutMinutes < MIN_SUPPLIER_TIMEOUT_MINUTES ||
    input.timeoutMinutes > MAX_SUPPLIER_TIMEOUT_MINUTES
  ) {
    return false;
  }
  return (
    new Date(input.now).getTime() >=
    new Date(input.sentAt).getTime() + input.timeoutMinutes * 60_000
  );
}

function expectedSupplierState(
  action: TransportServicingAction,
  current: TransportSupplierAcknowledgement,
): TransportSupplierAcknowledgement {
  switch (action) {
    case 'SUBMIT_TO_SUPPLIER':
      return 'PENDING';
    case 'ACKNOWLEDGE':
      return 'ACKNOWLEDGED';
    case 'SUPPLIER_REJECT':
      return 'REJECTED';
    case 'TIME_OUT':
      return 'TIMED_OUT';
    default:
      return current;
  }
}

function supplierStateAllowsAction(
  action: TransportServicingAction,
  current: TransportSupplierAcknowledgement,
): boolean {
  switch (action) {
    case 'SUBMIT_TO_SUPPLIER':
      return current === 'NOT_SENT' || current === 'TIMED_OUT';
    case 'ACKNOWLEDGE':
    case 'SUPPLIER_REJECT':
    case 'TIME_OUT':
      return current === 'PENDING';
    case 'START_PROCESSING':
    case 'COMPLETE':
      return current === 'ACKNOWLEDGED' || current === 'NOT_REQUIRED';
    default:
      return true;
  }
}

export function evaluateTransportServicingTransition(input: {
  action: TransportServicingAction;
  actorRole: TransportServicingActorRole;
  actorUserId: string;
  currentSupplierAcknowledgement: TransportSupplierAcknowledgement;
  currentVersion: number;
  expectedVersion: number;
  fromStatus: TransportServicingStatus;
  idempotencyKey: unknown;
  now: string;
  reason: string;
  supplierDeadlineAt?: string | null;
  toStatus: TransportServicingStatus;
}): TransportServicingRuleResult<TransportServicingTransitionEvent> {
  const errors: string[] = [];
  const expectedStatus = TRANSITIONS[input.fromStatus][input.action];
  const idempotencyKey = normalizeTransportServicingIdempotencyKey(input.idempotencyKey);
  const reason = boundedText(input.reason, MAX_REASON_LENGTH);
  if (!isTransportServicingActionAllowed(input.action, input.actorRole)) {
    errors.push('Actor role is not permitted to perform this servicing action.');
  }
  if (!SAFE_ID_PATTERN.test(input.actorUserId)) errors.push('Actor account is invalid.');
  if (!idempotencyKey) errors.push('Transition idempotency key is invalid.');
  if (!isIsoInstant(input.now)) errors.push('Transition time is invalid.');
  if (
    !Number.isInteger(input.currentVersion) ||
    input.currentVersion < 1 ||
    input.currentVersion >= MAX_VERSION
  ) {
    errors.push('Current servicing version is invalid.');
  }
  if (input.expectedVersion !== input.currentVersion) {
    errors.push('Servicing request changed. Refresh before applying this action.');
  }
  if (!expectedStatus || expectedStatus !== input.toStatus) {
    errors.push('Requested servicing lifecycle transition is not allowed.');
  }
  if (!supplierStateAllowsAction(input.action, input.currentSupplierAcknowledgement)) {
    errors.push('Supplier acknowledgement state does not allow this action.');
  }
  if (input.action === 'TIME_OUT') {
    if (!input.supplierDeadlineAt || !isIsoInstant(input.supplierDeadlineAt)) {
      errors.push('A valid supplier deadline is required to time out the request.');
    } else if (isIsoInstant(input.now) && input.supplierDeadlineAt > input.now) {
      errors.push('Supplier acknowledgement deadline has not elapsed.');
    }
  }
  if (reason.length < MIN_REASON_LENGTH) {
    errors.push(`Transition reason must contain at least ${MIN_REASON_LENGTH} characters.`);
  }
  if (input.reason.trim().replace(/\s+/g, ' ').length > MAX_REASON_LENGTH) {
    errors.push(`Transition reason cannot exceed ${MAX_REASON_LENGTH} characters.`);
  }
  if (errors.length || !idempotencyKey) return { errors, ok: false };
  return {
    ok: true,
    value: Object.freeze({
      action: input.action,
      actorUserId: input.actorUserId,
      fromStatus: input.fromStatus,
      idempotencyKey,
      nextVersion: input.currentVersion + 1,
      occurredAt: input.now,
      reason,
      supplierAcknowledgement: expectedSupplierState(
        input.action,
        input.currentSupplierAcknowledgement,
      ),
      toStatus: input.toStatus,
    }),
  };
}

export function validateTransportServicingFinancialState(
  state: TransportServicingFinancialState,
  requestStatus: TransportServicingStatus,
): TransportServicingRuleResult<TransportServicingFinancialState> {
  const errors: string[] = [];
  const hasRefundId = Boolean(state.refundRequestId && SAFE_ID_PATTERN.test(state.refundRequestId));
  if (state.refundRequestId && !hasRefundId) errors.push('Refund request reference is invalid.');
  if (
    ['NOT_APPLICABLE', 'NOT_REQUIRED', 'PENDING_DETERMINATION', 'REQUIRED_UNLINKED'].includes(
      state.refundLinkage,
    )
  ) {
    if (state.refundRequestId) errors.push('Refund request must not be linked in this state.');
  } else if (!hasRefundId) {
    errors.push('Refund-required state must link a valid refund request.');
  }
  if (state.refundLinkage === 'REQUIRED_UNLINKED' && state.refundRequestId) {
    errors.push('Unlinked refund state must not contain a refund request.');
  }
  if (state.refundLinkage === 'NOT_APPLICABLE' && state.reconciliationStatus !== 'NOT_APPLICABLE') {
    errors.push('Non-applicable refunds must not enter reconciliation.');
  }
  if (
    state.refundLinkage === 'COMPLETED' &&
    !['MATCHED', 'RESOLVED'].includes(state.reconciliationStatus)
  ) {
    errors.push('Completed refund linkage requires matched or resolved reconciliation.');
  }
  if (
    requestStatus === 'COMPLETED' &&
    !['NOT_APPLICABLE', 'NOT_REQUIRED', 'COMPLETED'].includes(state.refundLinkage)
  ) {
    errors.push('Servicing cannot complete while refund determination or linkage is unresolved.');
  }
  return errors.length ? { errors, ok: false } : { ok: true, value: { ...state } };
}

export interface TransportServicingProjectionSource {
  bookingReference: string;
  customerUserId: string;
  id: string;
  internalSummary: string;
  productType: TransportServicingProduct;
  reconciliationStatus: TransportServicingReconciliation;
  refundLinkage: TransportRefundLinkage;
  refundRequestId: string | null;
  requestSummary: string;
  requestType: TransportServicingRequestType;
  status: TransportServicingStatus;
  submittedAt: string;
  supplierAcknowledgement: TransportSupplierAcknowledgement;
  supplierDeadlineAt: string | null;
  supplierReference: string | null;
  updatedAt: string;
  version: number;
}

export function customerSafeTransportServicingProjection(
  source: TransportServicingProjectionSource,
) {
  const publicStatus =
    source.status === 'COMPLETED'
      ? 'COMPLETED'
      : source.status === 'REJECTED'
        ? 'NOT_APPROVED'
        : source.status === 'WITHDRAWN'
          ? 'WITHDRAWN'
          : ['FAILED', 'TIMED_OUT'].includes(source.status)
            ? 'NEEDS_ATTENTION'
            : 'UNDER_REVIEW';
  const refundStatus =
    source.refundLinkage === 'COMPLETED'
      ? 'COMPLETED'
      : ['REQUIRED_LINKED', 'REQUIRED_UNLINKED'].includes(source.refundLinkage)
        ? 'IN_PROGRESS'
        : source.refundLinkage === 'PENDING_DETERMINATION'
          ? 'UNDER_REVIEW'
          : 'NONE';
  return {
    bookingReference: source.bookingReference,
    id: source.id,
    productType: source.productType,
    publicStatus,
    refundStatus,
    requestSummary: boundedText(source.requestSummary, 500),
    requestType: source.requestType,
    submittedAt: source.submittedAt,
    updatedAt: source.updatedAt,
  } as const;
}

export function adminSafeTransportServicingProjection(source: TransportServicingProjectionSource) {
  return {
    bookingReference: source.bookingReference,
    customerUserId: source.customerUserId,
    id: source.id,
    internalSummary: boundedText(source.internalSummary, 1_000),
    productType: source.productType,
    reconciliationStatus: source.reconciliationStatus,
    refundLinkage: source.refundLinkage,
    refundRequestId: source.refundRequestId,
    requestSummary: boundedText(source.requestSummary, 1_000),
    requestType: source.requestType,
    status: source.status,
    submittedAt: source.submittedAt,
    supplierAcknowledgement: source.supplierAcknowledgement,
    supplierDeadlineAt: source.supplierDeadlineAt,
    supplierReference: source.supplierReference ? boundedText(source.supplierReference, 120) : null,
    updatedAt: source.updatedAt,
    version: source.version,
  } as const;
}
