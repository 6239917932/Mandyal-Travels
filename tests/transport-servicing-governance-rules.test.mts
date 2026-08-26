import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminSafeTransportServicingProjection,
  customerSafeTransportServicingProjection,
  evaluateTransportServicingTransition,
  isTransportServicingActionAllowed,
  normalizeTransportServicingRequest,
  supplierAcknowledgementTimedOut,
  transportServicingIdempotencyDecision,
  validateTransportServicingFinancialState,
  type TransportServicingProjectionSource,
} from '../lib/transport/servicingGovernanceRules.ts';

const request = normalizeTransportServicingRequest({
  bookingReference: ' mb-1234 ',
  customerUserId: 'user_123',
  idempotencyKey: 'tsr_1234567890abcdef',
  productType: 'bus',
  requestSummary: 'Please cancel both confirmed seats on this service.',
  requestType: 'cancel',
});

test('change and cancel requests are normalized and idempotency is context-bound', () => {
  assert.ok(request);
  assert.equal(request.bookingReference, 'MB-1234');
  assert.equal(transportServicingIdempotencyDecision(null, request), 'NEW');
  assert.equal(transportServicingIdempotencyDecision(request, request), 'REPLAY');
  assert.equal(
    transportServicingIdempotencyDecision(
      request,
      request ? { ...request, requestSummary: 'Please change the departure date instead.' } : null,
    ),
    'CONFLICT',
  );
});

test('permissions separate customer, supplier, support, finance, and system actions', () => {
  assert.equal(isTransportServicingActionAllowed('WITHDRAW', 'CUSTOMER'), true);
  assert.equal(isTransportServicingActionAllowed('ACKNOWLEDGE', 'CUSTOMER'), false);
  assert.equal(isTransportServicingActionAllowed('ACKNOWLEDGE', 'SUPPLIER_OPERATOR'), true);
  assert.equal(isTransportServicingActionAllowed('LINK_REFUND', 'FINANCE_REVIEWER'), true);
  assert.equal(isTransportServicingActionAllowed('MARK_RECONCILIATION', 'SUPPORT_AGENT'), false);
});

test('supplier acknowledgement timeout is deterministic and bounded', () => {
  assert.equal(
    supplierAcknowledgementTimedOut({
      acknowledgement: 'PENDING',
      now: '2026-08-26T10:30:00.000Z',
      sentAt: '2026-08-26T10:00:00.000Z',
      timeoutMinutes: 30,
    }),
    true,
  );
  assert.equal(
    supplierAcknowledgementTimedOut({
      acknowledgement: 'ACKNOWLEDGED',
      now: '2026-08-26T10:30:00.000Z',
      sentAt: '2026-08-26T10:00:00.000Z',
      timeoutMinutes: 30,
    }),
    false,
  );
});

test('immutable lifecycle transition validates action, role, version, and reason', () => {
  const accepted = evaluateTransportServicingTransition({
    action: 'ACKNOWLEDGE',
    actorRole: 'SUPPLIER_OPERATOR',
    actorUserId: 'supplier_user_1',
    currentSupplierAcknowledgement: 'PENDING',
    currentVersion: 3,
    expectedVersion: 3,
    fromStatus: 'AWAITING_SUPPLIER',
    idempotencyKey: 'tsr_abcdef1234567890',
    now: '2026-08-26T10:30:00.000Z',
    reason: 'Supplier accepted the governed cancellation request.',
    toStatus: 'APPROVED',
  });
  assert.equal(accepted.ok, true);
  if (accepted.ok) {
    assert.equal(accepted.value.nextVersion, 4);
    assert.equal(accepted.value.supplierAcknowledgement, 'ACKNOWLEDGED');
    assert.equal(Object.isFrozen(accepted.value), true);
  }
  assert.equal(
    evaluateTransportServicingTransition({
      action: 'ACKNOWLEDGE',
      actorRole: 'CUSTOMER',
      actorUserId: 'user_123',
      currentSupplierAcknowledgement: 'PENDING',
      currentVersion: 3,
      expectedVersion: 2,
      fromStatus: 'AWAITING_SUPPLIER',
      idempotencyKey: 'invalid',
      now: '2026-08-26T10:30:00.000Z',
      reason: 'no',
      toStatus: 'APPROVED',
    }).ok,
    false,
  );
});

test('completion fails closed while required refunds or reconciliation are unresolved', () => {
  assert.equal(
    validateTransportServicingFinancialState(
      {
        reconciliationStatus: 'PENDING',
        refundLinkage: 'REQUIRED_UNLINKED',
        refundRequestId: null,
      },
      'COMPLETED',
    ).ok,
    false,
  );
  assert.equal(
    validateTransportServicingFinancialState(
      {
        reconciliationStatus: 'MATCHED',
        refundLinkage: 'COMPLETED',
        refundRequestId: 'refund_123',
      },
      'COMPLETED',
    ).ok,
    true,
  );
});

test('customer and admin projections are explicit allowlists with different detail', () => {
  const source: TransportServicingProjectionSource = {
    bookingReference: 'MB-1234',
    customerUserId: 'user_123',
    id: 'request_123',
    internalSummary: 'Supplier queue retry approved after signed callback review.',
    productType: 'BUS',
    reconciliationStatus: 'PENDING',
    refundLinkage: 'REQUIRED_LINKED',
    refundRequestId: 'refund_123',
    requestSummary: 'Cancel both seats.',
    requestType: 'CANCEL',
    status: 'PROCESSING',
    submittedAt: '2026-08-26T10:00:00.000Z',
    supplierAcknowledgement: 'ACKNOWLEDGED',
    supplierDeadlineAt: '2026-08-26T10:30:00.000Z',
    supplierReference: 'supplier-cancel-456',
    updatedAt: '2026-08-26T10:20:00.000Z',
    version: 4,
  };
  const customer = customerSafeTransportServicingProjection(source);
  const admin = adminSafeTransportServicingProjection(source);
  assert.equal(customer.publicStatus, 'UNDER_REVIEW');
  assert.equal(customer.refundStatus, 'IN_PROGRESS');
  assert.equal('supplierReference' in customer, false);
  assert.equal('internalSummary' in customer, false);
  assert.equal(admin.supplierReference, 'supplier-cancel-456');
  assert.equal(admin.refundRequestId, 'refund_123');
});
