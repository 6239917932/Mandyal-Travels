export const GOVERNED_AI_USE_CASES = [
  'TRIP_PLANNER',
  'SEARCH',
  'SUPPORT',
  'PRICING',
  'RISK',
] as const;
export const GOVERNED_AI_EXECUTION_STATES = ['COMPLETED', 'FAILED', 'BLOCKED'] as const;
export const GOVERNED_AI_EVALUATION_STATES = ['PASSED', 'FAILED'] as const;
export const GOVERNED_AI_OUTCOME_STATES = [
  'SUGGESTION_READY',
  'HUMAN_REVIEW_PENDING',
  'HUMAN_REVIEWED',
  'FALLBACK_USED',
  'SAFE_FAILURE',
] as const;
export const GOVERNED_AI_REVIEW_STATES = [
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;
export const GOVERNED_AI_FALLBACKS = [
  'NONE',
  'DETERMINISTIC',
  'HUMAN_QUEUE',
  'SAFE_UNAVAILABLE',
] as const;
export const GOVERNED_AI_RETENTION_CLASSES = ['STANDARD_180_DAYS', 'GOVERNANCE_7_YEARS'] as const;
export const GOVERNED_AI_ACCESS_CLASSES = ['INTERNAL_RESTRICTED', 'HIGHLY_RESTRICTED'] as const;

export type GovernedAiUseCase = (typeof GOVERNED_AI_USE_CASES)[number];
export type GovernedAiExecutionState = (typeof GOVERNED_AI_EXECUTION_STATES)[number];
export type GovernedAiEvaluationState = (typeof GOVERNED_AI_EVALUATION_STATES)[number];
export type GovernedAiOutcomeState = (typeof GOVERNED_AI_OUTCOME_STATES)[number];
export type GovernedAiReviewState = (typeof GOVERNED_AI_REVIEW_STATES)[number];
export type GovernedAiFallback = (typeof GOVERNED_AI_FALLBACKS)[number];
export type GovernedAiRetentionClass = (typeof GOVERNED_AI_RETENTION_CLASSES)[number];
export type GovernedAiAccessClass = (typeof GOVERNED_AI_ACCESS_CLASSES)[number];

export type GovernedAiAuditRecord = Readonly<{
  version: 1;
  interactionId: string;
  occurredAt: string;
  useCase: GovernedAiUseCase;
  model: Readonly<{ provider: string; name: string; version: string; policyVersion: string }>;
  promptHash: string;
  inputHash: string;
  outputHash: string | null;
  consequentialAction: 'NONE';
  executionState: GovernedAiExecutionState;
  confidenceBasisPoints: number | null;
  evaluationState: GovernedAiEvaluationState;
  outcomeState: GovernedAiOutcomeState;
  humanReview: Readonly<{
    required: boolean;
    state: GovernedAiReviewState;
    reviewerRefHash: string | null;
    reviewedAt: string | null;
  }>;
  failure: Readonly<{ code: string | null; fallback: GovernedAiFallback }>;
  retentionClass: GovernedAiRetentionClass;
  accessClass: GovernedAiAccessClass;
}>;

export type CustomerSafeAiProjection = Readonly<{
  assistedByAi: true;
  useCase: GovernedAiUseCase;
  outcomeState: GovernedAiOutcomeState;
  humanReview: 'NOT_REQUIRED' | 'PENDING' | 'COMPLETED';
  fallbackUsed: boolean;
  statusMessage:
    'RESULT_READY' | 'REVIEW_IN_PROGRESS' | 'REVIEW_COMPLETED' | 'FALLBACK_USED' | 'UNAVAILABLE';
}>;

export type OperatorSafeAiProjection = Readonly<{
  version: 1;
  interactionId: string;
  occurredAt: string;
  useCase: GovernedAiUseCase;
  model: Readonly<{ provider: string; name: string; version: string; policyVersion: string }>;
  evidence: Readonly<{ promptHash: string; inputHash: string; outputHash: string | null }>;
  executionState: GovernedAiExecutionState;
  confidenceBasisPoints: number | null;
  evaluationState: GovernedAiEvaluationState;
  outcomeState: GovernedAiOutcomeState;
  humanReview: Readonly<{ required: boolean; state: GovernedAiReviewState }>;
  failure: Readonly<{ code: string | null; fallback: GovernedAiFallback }>;
  retentionClass: GovernedAiRetentionClass;
  accessClass: GovernedAiAccessClass;
}>;

export type GovernedAiAuditErrorCode =
  | 'INVALID_RECORD'
  | 'RAW_DATA_NOT_ALLOWED'
  | 'INVALID_IDENTITY'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_USE_CASE'
  | 'INVALID_MODEL_METADATA'
  | 'INVALID_HASH'
  | 'CONSEQUENTIAL_ACTION_PROHIBITED'
  | 'INVALID_EXECUTION_STATE'
  | 'INVALID_CONFIDENCE'
  | 'INVALID_EVALUATION_STATE'
  | 'INVALID_OUTCOME_STATE'
  | 'INVALID_REVIEW'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'INVALID_FAILURE_BEHAVIOR'
  | 'INVALID_RETENTION'
  | 'INVALID_ACCESS_CLASSIFICATION';

export class GovernedAiAuditError extends Error {
  readonly code: GovernedAiAuditErrorCode;

  constructor(code: GovernedAiAuditErrorCode, message: string) {
    super(message);
    this.name = 'GovernedAiAuditError';
    this.code = code;
  }
}

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const TOP_LEVEL_KEYS = new Set([
  'interactionId',
  'occurredAt',
  'useCase',
  'model',
  'promptHash',
  'inputHash',
  'outputHash',
  'consequentialAction',
  'executionState',
  'confidenceBasisPoints',
  'evaluationState',
  'outcomeState',
  'humanReview',
  'failure',
  'retentionClass',
  'accessClass',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMember<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function hasExactKeys(record: Record<string, unknown>, keys: ReadonlySet<string>): boolean {
  return (
    Object.keys(record).length === keys.size && Object.keys(record).every((key) => keys.has(key))
  );
}

function readSafeIdentifier(value: unknown, code: GovernedAiAuditErrorCode, label: string): string {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new GovernedAiAuditError(code, `${label} is invalid.`);
  }
  return value;
}

function readInstant(value: unknown, code: GovernedAiAuditErrorCode, label: string): string {
  if (
    typeof value !== 'string' ||
    !ISO_INSTANT_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new GovernedAiAuditError(code, `${label} must be a valid UTC timestamp.`);
  }
  return value;
}

function readHash(value: unknown, nullable: boolean, label: string): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new GovernedAiAuditError('INVALID_HASH', `${label} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function parseModel(value: unknown): GovernedAiAuditRecord['model'] {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, new Set(['provider', 'name', 'version', 'policyVersion']))
  ) {
    throw new GovernedAiAuditError('INVALID_MODEL_METADATA', 'Model metadata is invalid.');
  }
  return Object.freeze({
    provider: readSafeIdentifier(value.provider, 'INVALID_MODEL_METADATA', 'Model provider'),
    name: readSafeIdentifier(value.name, 'INVALID_MODEL_METADATA', 'Model name'),
    version: readSafeIdentifier(value.version, 'INVALID_MODEL_METADATA', 'Model version'),
    policyVersion: readSafeIdentifier(
      value.policyVersion,
      'INVALID_MODEL_METADATA',
      'Policy version',
    ),
  });
}

function parseReview(value: unknown): GovernedAiAuditRecord['humanReview'] {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, new Set(['required', 'state', 'reviewerRefHash', 'reviewedAt']))
  ) {
    throw new GovernedAiAuditError('INVALID_REVIEW', 'Human review metadata is invalid.');
  }
  if (typeof value.required !== 'boolean' || !isMember(GOVERNED_AI_REVIEW_STATES, value.state)) {
    throw new GovernedAiAuditError('INVALID_REVIEW', 'Human review state is invalid.');
  }
  const reviewerRefHash = readHash(value.reviewerRefHash, true, 'Reviewer reference');
  const reviewedAt =
    value.reviewedAt === null
      ? null
      : readInstant(value.reviewedAt, 'INVALID_REVIEW', 'Review timestamp');
  const completed = value.state === 'APPROVED' || value.state === 'REJECTED';
  if (
    (value.required && value.state === 'NOT_REQUIRED') ||
    (!value.required && value.state !== 'NOT_REQUIRED') ||
    (completed && (!reviewerRefHash || !reviewedAt)) ||
    (!completed && (reviewerRefHash !== null || reviewedAt !== null))
  ) {
    throw new GovernedAiAuditError('INVALID_REVIEW', 'Human review metadata is inconsistent.');
  }
  return Object.freeze({
    required: value.required,
    state: value.state,
    reviewerRefHash,
    reviewedAt,
  });
}

function parseFailure(value: unknown): GovernedAiAuditRecord['failure'] {
  if (!isRecord(value) || !hasExactKeys(value, new Set(['code', 'fallback']))) {
    throw new GovernedAiAuditError('INVALID_FAILURE_BEHAVIOR', 'Failure metadata is invalid.');
  }
  if (!isMember(GOVERNED_AI_FALLBACKS, value.fallback)) {
    throw new GovernedAiAuditError('INVALID_FAILURE_BEHAVIOR', 'Fallback behavior is invalid.');
  }
  const code =
    value.code === null
      ? null
      : readSafeIdentifier(value.code, 'INVALID_FAILURE_BEHAVIOR', 'Failure code');
  return Object.freeze({ code, fallback: value.fallback });
}

function requiredGovernance(useCase: GovernedAiUseCase): {
  review: boolean;
  retention: GovernedAiRetentionClass;
  access: GovernedAiAccessClass;
} {
  return useCase === 'PRICING' || useCase === 'RISK'
    ? { review: true, retention: 'GOVERNANCE_7_YEARS', access: 'HIGHLY_RESTRICTED' }
    : { review: false, retention: 'STANDARD_180_DAYS', access: 'INTERNAL_RESTRICTED' };
}

export function validateGovernedAiAuditRecord(value: unknown): GovernedAiAuditRecord {
  if (!isRecord(value)) {
    throw new GovernedAiAuditError('INVALID_RECORD', 'AI audit record must be an object.');
  }
  if (!hasExactKeys(value, TOP_LEVEL_KEYS)) {
    throw new GovernedAiAuditError(
      'RAW_DATA_NOT_ALLOWED',
      'AI audit records accept only governed metadata and hashes; raw prompt, input, output, PII, and secrets are prohibited.',
    );
  }

  const interactionId = readSafeIdentifier(
    value.interactionId,
    'INVALID_IDENTITY',
    'Interaction identifier',
  );
  const occurredAt = readInstant(value.occurredAt, 'INVALID_TIMESTAMP', 'Occurrence timestamp');
  if (!isMember(GOVERNED_AI_USE_CASES, value.useCase)) {
    throw new GovernedAiAuditError('INVALID_USE_CASE', 'AI use case is unsupported.');
  }
  const useCase = value.useCase;
  const model = parseModel(value.model);
  const promptHash = readHash(value.promptHash, false, 'Prompt hash') as string;
  const inputHash = readHash(value.inputHash, false, 'Input hash') as string;
  const outputHash = readHash(value.outputHash, true, 'Output hash');
  if (value.consequentialAction !== 'NONE') {
    throw new GovernedAiAuditError(
      'CONSEQUENTIAL_ACTION_PROHIBITED',
      'AI audit records cannot authorize pricing, inventory, booking, payment, refund, or risk actions.',
    );
  }
  if (!isMember(GOVERNED_AI_EXECUTION_STATES, value.executionState)) {
    throw new GovernedAiAuditError('INVALID_EXECUTION_STATE', 'AI execution state is invalid.');
  }
  const executionState = value.executionState;
  const confidenceBasisPoints = value.confidenceBasisPoints;
  if (
    confidenceBasisPoints !== null &&
    (typeof confidenceBasisPoints !== 'number' ||
      !Number.isSafeInteger(confidenceBasisPoints) ||
      confidenceBasisPoints < 0 ||
      confidenceBasisPoints > 10_000)
  ) {
    throw new GovernedAiAuditError(
      'INVALID_CONFIDENCE',
      'Confidence must be null or integer basis points from 0 to 10000.',
    );
  }
  if (!isMember(GOVERNED_AI_EVALUATION_STATES, value.evaluationState)) {
    throw new GovernedAiAuditError('INVALID_EVALUATION_STATE', 'AI evaluation state is invalid.');
  }
  if (!isMember(GOVERNED_AI_OUTCOME_STATES, value.outcomeState)) {
    throw new GovernedAiAuditError('INVALID_OUTCOME_STATE', 'AI outcome state is invalid.');
  }
  const humanReview = parseReview(value.humanReview);
  const failure = parseFailure(value.failure);
  if (!isMember(GOVERNED_AI_RETENTION_CLASSES, value.retentionClass)) {
    throw new GovernedAiAuditError('INVALID_RETENTION', 'AI audit retention class is invalid.');
  }
  if (!isMember(GOVERNED_AI_ACCESS_CLASSES, value.accessClass)) {
    throw new GovernedAiAuditError(
      'INVALID_ACCESS_CLASSIFICATION',
      'AI audit access class is invalid.',
    );
  }

  const governance = requiredGovernance(useCase);
  if (humanReview.required !== governance.review) {
    throw new GovernedAiAuditError(
      'HUMAN_REVIEW_REQUIRED',
      'This AI use case has an invalid human-review posture.',
    );
  }
  if (value.retentionClass !== governance.retention) {
    throw new GovernedAiAuditError(
      'INVALID_RETENTION',
      'AI audit retention does not meet use-case policy.',
    );
  }
  if (value.accessClass !== governance.access) {
    throw new GovernedAiAuditError(
      'INVALID_ACCESS_CLASSIFICATION',
      'AI audit access classification does not meet use-case policy.',
    );
  }

  const completed = executionState === 'COMPLETED';
  if (
    (completed &&
      (outputHash === null ||
        confidenceBasisPoints === null ||
        value.evaluationState !== 'PASSED')) ||
    (!completed &&
      (outputHash !== null ||
        confidenceBasisPoints !== null ||
        value.evaluationState !== 'FAILED')) ||
    (completed && (failure.code !== null || failure.fallback !== 'NONE')) ||
    (!completed && (failure.code === null || failure.fallback === 'NONE'))
  ) {
    throw new GovernedAiAuditError(
      'INVALID_FAILURE_BEHAVIOR',
      'Execution, evidence, evaluation, and fallback states conflict.',
    );
  }

  const validOutcome =
    (value.outcomeState === 'SUGGESTION_READY' &&
      completed &&
      humanReview.state === 'NOT_REQUIRED') ||
    (value.outcomeState === 'HUMAN_REVIEW_PENDING' &&
      completed &&
      humanReview.state === 'PENDING') ||
    (value.outcomeState === 'HUMAN_REVIEWED' &&
      completed &&
      (humanReview.state === 'APPROVED' || humanReview.state === 'REJECTED')) ||
    (value.outcomeState === 'FALLBACK_USED' &&
      !completed &&
      (failure.fallback === 'DETERMINISTIC' || failure.fallback === 'HUMAN_QUEUE')) ||
    (value.outcomeState === 'SAFE_FAILURE' &&
      !completed &&
      (failure.fallback === 'HUMAN_QUEUE' || failure.fallback === 'SAFE_UNAVAILABLE'));
  if (!validOutcome) {
    throw new GovernedAiAuditError(
      'INVALID_OUTCOME_STATE',
      'AI outcome conflicts with execution, review, or fallback state.',
    );
  }

  return Object.freeze({
    version: 1,
    interactionId,
    occurredAt,
    useCase,
    model,
    promptHash,
    inputHash,
    outputHash,
    consequentialAction: 'NONE',
    executionState,
    confidenceBasisPoints,
    evaluationState: value.evaluationState,
    outcomeState: value.outcomeState,
    humanReview,
    failure,
    retentionClass: value.retentionClass,
    accessClass: value.accessClass,
  });
}

export function toCustomerSafeAiProjection(
  record: GovernedAiAuditRecord,
): CustomerSafeAiProjection {
  const statusMessage =
    record.outcomeState === 'SUGGESTION_READY'
      ? 'RESULT_READY'
      : record.outcomeState === 'HUMAN_REVIEW_PENDING'
        ? 'REVIEW_IN_PROGRESS'
        : record.outcomeState === 'HUMAN_REVIEWED'
          ? 'REVIEW_COMPLETED'
          : record.outcomeState === 'FALLBACK_USED'
            ? 'FALLBACK_USED'
            : 'UNAVAILABLE';
  const humanReview =
    record.humanReview.state === 'NOT_REQUIRED'
      ? 'NOT_REQUIRED'
      : record.humanReview.state === 'PENDING'
        ? 'PENDING'
        : 'COMPLETED';
  return Object.freeze({
    assistedByAi: true,
    useCase: record.useCase,
    outcomeState: record.outcomeState,
    humanReview,
    fallbackUsed: record.failure.fallback !== 'NONE',
    statusMessage,
  });
}

export function toOperatorSafeAiProjection(
  record: GovernedAiAuditRecord,
): OperatorSafeAiProjection {
  return Object.freeze({
    version: 1,
    interactionId: record.interactionId,
    occurredAt: record.occurredAt,
    useCase: record.useCase,
    model: record.model,
    evidence: Object.freeze({
      promptHash: record.promptHash,
      inputHash: record.inputHash,
      outputHash: record.outputHash,
    }),
    executionState: record.executionState,
    confidenceBasisPoints: record.confidenceBasisPoints,
    evaluationState: record.evaluationState,
    outcomeState: record.outcomeState,
    humanReview: Object.freeze({
      required: record.humanReview.required,
      state: record.humanReview.state,
    }),
    failure: record.failure,
    retentionClass: record.retentionClass,
    accessClass: record.accessClass,
  });
}
