import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GovernedAiAuditError,
  toCustomerSafeAiProjection,
  toOperatorSafeAiProjection,
  validateGovernedAiAuditRecord,
} from '../services/governedAiAuditRules.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const HASH_D = 'd'.repeat(64);

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    interactionId: 'ai-interaction-001',
    occurredAt: '2026-08-26T10:00:00Z',
    useCase: 'TRIP_PLANNER',
    model: {
      provider: 'approved-provider',
      name: 'planner-model',
      version: '2026-08',
      policyVersion: 'policy-1',
    },
    promptHash: HASH_A,
    inputHash: HASH_B,
    outputHash: HASH_C,
    consequentialAction: 'NONE',
    executionState: 'COMPLETED',
    confidenceBasisPoints: 8_500,
    evaluationState: 'PASSED',
    outcomeState: 'SUGGESTION_READY',
    humanReview: {
      required: false,
      state: 'NOT_REQUIRED',
      reviewerRefHash: null,
      reviewedAt: null,
    },
    failure: { code: null, fallback: 'NONE' },
    retentionClass: 'STANDARD_180_DAYS',
    accessClass: 'INTERNAL_RESTRICTED',
    ...overrides,
  };
}

function expectCode(code: GovernedAiAuditError['code'], callback: () => unknown) {
  assert.throws(
    callback,
    (error: unknown) => error instanceof GovernedAiAuditError && error.code === code,
  );
}

test('normalizes an immutable advisory trip-planner audit record', () => {
  const record = validateGovernedAiAuditRecord(candidate());
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.model), true);
  assert.equal(record.consequentialAction, 'NONE');
  assert.equal(record.confidenceBasisPoints, 8_500);
});

test('accepts all governed advisory use cases with their required classifications', () => {
  for (const useCase of ['TRIP_PLANNER', 'SEARCH', 'SUPPORT']) {
    assert.equal(validateGovernedAiAuditRecord(candidate({ useCase })).useCase, useCase);
  }
  for (const useCase of ['PRICING', 'RISK']) {
    const record = validateGovernedAiAuditRecord(
      candidate({
        useCase,
        outcomeState: 'HUMAN_REVIEW_PENDING',
        humanReview: { required: true, state: 'PENDING', reviewerRefHash: null, reviewedAt: null },
        retentionClass: 'GOVERNANCE_7_YEARS',
        accessClass: 'HIGHLY_RESTRICTED',
      }),
    );
    assert.equal(record.humanReview.required, true);
  }
});

test('rejects raw prompt, input, output, PII, secrets, and all unknown fields', () => {
  for (const forbidden of ['prompt', 'input', 'output', 'email', 'apiKey', 'secret']) {
    expectCode('RAW_DATA_NOT_ALLOWED', () =>
      validateGovernedAiAuditRecord({ ...candidate(), [forbidden]: 'must never be stored' }),
    );
  }
});

test('requires lowercase SHA-256 evidence hashes', () => {
  for (const promptHash of ['short', HASH_A.toUpperCase(), null]) {
    expectCode('INVALID_HASH', () => validateGovernedAiAuditRecord(candidate({ promptHash })));
  }
  expectCode('INVALID_HASH', () =>
    validateGovernedAiAuditRecord(candidate({ outputHash: 'short' })),
  );
});

test('prohibits every consequential AI action', () => {
  for (const consequentialAction of ['CHANGE_PRICE', 'BOOK', 'REFUND', 'BLOCK_CUSTOMER']) {
    expectCode('CONSEQUENTIAL_ACTION_PROHIBITED', () =>
      validateGovernedAiAuditRecord(candidate({ consequentialAction })),
    );
  }
});

test('requires pricing and risk review with seven-year highly restricted governance', () => {
  expectCode('HUMAN_REVIEW_REQUIRED', () =>
    validateGovernedAiAuditRecord(candidate({ useCase: 'PRICING' })),
  );
  expectCode('INVALID_RETENTION', () =>
    validateGovernedAiAuditRecord(
      candidate({
        useCase: 'RISK',
        outcomeState: 'HUMAN_REVIEW_PENDING',
        humanReview: { required: true, state: 'PENDING', reviewerRefHash: null, reviewedAt: null },
        accessClass: 'HIGHLY_RESTRICTED',
      }),
    ),
  );
  expectCode('INVALID_ACCESS_CLASSIFICATION', () =>
    validateGovernedAiAuditRecord(
      candidate({
        useCase: 'PRICING',
        outcomeState: 'HUMAN_REVIEW_PENDING',
        humanReview: { required: true, state: 'PENDING', reviewerRefHash: null, reviewedAt: null },
        retentionClass: 'GOVERNANCE_7_YEARS',
      }),
    ),
  );
});

test('requires complete reviewer evidence only for approved or rejected review', () => {
  const reviewed = validateGovernedAiAuditRecord(
    candidate({
      useCase: 'RISK',
      outcomeState: 'HUMAN_REVIEWED',
      humanReview: {
        required: true,
        state: 'APPROVED',
        reviewerRefHash: HASH_D,
        reviewedAt: '2026-08-26T10:05:00Z',
      },
      retentionClass: 'GOVERNANCE_7_YEARS',
      accessClass: 'HIGHLY_RESTRICTED',
    }),
  );
  assert.equal(reviewed.humanReview.state, 'APPROVED');
  expectCode('INVALID_REVIEW', () =>
    validateGovernedAiAuditRecord(
      candidate({
        useCase: 'RISK',
        outcomeState: 'HUMAN_REVIEWED',
        humanReview: { required: true, state: 'APPROVED', reviewerRefHash: null, reviewedAt: null },
        retentionClass: 'GOVERNANCE_7_YEARS',
        accessClass: 'HIGHLY_RESTRICTED',
      }),
    ),
  );
});

test('fails closed when unsuccessful execution retains output or confidence', () => {
  const failed = {
    executionState: 'FAILED',
    outputHash: null,
    confidenceBasisPoints: null,
    evaluationState: 'FAILED',
    outcomeState: 'SAFE_FAILURE',
    failure: { code: 'MODEL_TIMEOUT', fallback: 'SAFE_UNAVAILABLE' },
  };
  assert.equal(validateGovernedAiAuditRecord(candidate(failed)).outcomeState, 'SAFE_FAILURE');
  expectCode('INVALID_FAILURE_BEHAVIOR', () =>
    validateGovernedAiAuditRecord(candidate({ ...failed, outputHash: HASH_C })),
  );
  expectCode('INVALID_FAILURE_BEHAVIOR', () =>
    validateGovernedAiAuditRecord(
      candidate({ ...failed, failure: { code: null, fallback: 'NONE' } }),
    ),
  );
});

test('records deterministic and human-queue fallbacks without pretending AI succeeded', () => {
  for (const fallback of ['DETERMINISTIC', 'HUMAN_QUEUE']) {
    const record = validateGovernedAiAuditRecord(
      candidate({
        executionState: 'FAILED',
        outputHash: null,
        confidenceBasisPoints: null,
        evaluationState: 'FAILED',
        outcomeState: 'FALLBACK_USED',
        failure: { code: 'MODEL_UNAVAILABLE', fallback },
      }),
    );
    assert.equal(record.failure.fallback, fallback);
  }
});

test('rejects inconsistent outcomes, reviews, and completed failure metadata', () => {
  expectCode('INVALID_OUTCOME_STATE', () =>
    validateGovernedAiAuditRecord(candidate({ outcomeState: 'HUMAN_REVIEW_PENDING' })),
  );
  expectCode('INVALID_REVIEW', () =>
    validateGovernedAiAuditRecord(
      candidate({
        humanReview: { required: false, state: 'PENDING', reviewerRefHash: null, reviewedAt: null },
      }),
    ),
  );
  expectCode('INVALID_FAILURE_BEHAVIOR', () =>
    validateGovernedAiAuditRecord(
      candidate({ failure: { code: 'ERROR', fallback: 'HUMAN_QUEUE' } }),
    ),
  );
});

test('rejects invalid confidence and model metadata', () => {
  for (const confidenceBasisPoints of [-1, 1.5, 10_001, Number.NaN]) {
    expectCode('INVALID_CONFIDENCE', () =>
      validateGovernedAiAuditRecord(candidate({ confidenceBasisPoints })),
    );
  }
  expectCode('INVALID_MODEL_METADATA', () =>
    validateGovernedAiAuditRecord(candidate({ model: { ...candidate().model, apiKey: 'secret' } })),
  );
});

test('customer projection exposes no model, hashes, reviewer, failure code, or access metadata', () => {
  const projection = toCustomerSafeAiProjection(validateGovernedAiAuditRecord(candidate()));
  assert.deepEqual(projection, {
    assistedByAi: true,
    useCase: 'TRIP_PLANNER',
    outcomeState: 'SUGGESTION_READY',
    humanReview: 'NOT_REQUIRED',
    fallbackUsed: false,
    statusMessage: 'RESULT_READY',
  });
  assert.doesNotMatch(
    JSON.stringify(projection),
    /provider|model|hash|reviewer|failure|retention|access|policy/i,
  );
});

test('operator projection contains verifiable hashes but excludes reviewer identity', () => {
  const record = validateGovernedAiAuditRecord(candidate());
  const projection = toOperatorSafeAiProjection(record);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.evidence), true);
  assert.equal(projection.evidence.promptHash, HASH_A);
  assert.doesNotMatch(JSON.stringify(projection), /reviewerRefHash|reviewedAt/);
});

test('validation is deterministic and does not mutate input', () => {
  const input = candidate();
  const before = structuredClone(input);
  assert.deepEqual(validateGovernedAiAuditRecord(input), validateGovernedAiAuditRecord(input));
  assert.deepEqual(input, before);
});
