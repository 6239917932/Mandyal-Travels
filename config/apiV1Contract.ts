export const API_V1_CONTRACT_REVISION = '2026-08-24';

export type ApiV1AuthMode =
  'CUSTOMER_SESSION' | 'OPTIONAL_SESSION' | 'PUBLIC' | 'TRAVEL_AGENCY_ADMIN';
export type ApiV1ErrorEnvelope = 'CODE_MESSAGE' | 'HEALTH_STATUS' | 'MESSAGE_ONLY' | 'NONE';
export type ApiV1HttpMethod = 'GET' | 'POST';
export type ApiV1Idempotency =
  | Readonly<{ mode: 'NOT_APPLICABLE' | 'NOT_SUPPORTED' }>
  | Readonly<{ header: 'Idempotency-Key'; mode: 'REQUIRED' }>;
export type ApiV1Pagination =
  Readonly<{ mode: 'NONE' }> | Readonly<{ maximumLimit: number; mode: 'FIXED_LIMIT' }>;

export type ApiV1SupportedOperation = Readonly<{
  auth: ApiV1AuthMode;
  errorEnvelope: ApiV1ErrorEnvelope;
  fulfillment: 'LOCAL_PORTAL_ONLY';
  idempotency: ApiV1Idempotency;
  method: ApiV1HttpMethod;
  operationId: string;
  pagination: ApiV1Pagination;
  path: `/api/v1/${string}`;
  successStatus: number;
  summary: string;
  tag: 'Account' | 'Agency' | 'Health' | 'Hotels' | 'Meta' | 'Promotions';
}>;

export const API_V1_SUPPORTED_OPERATIONS = [
  {
    auth: 'PUBLIC',
    errorEnvelope: 'NONE',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_APPLICABLE' },
    method: 'GET',
    operationId: 'getApiV1Meta',
    pagination: { mode: 'NONE' },
    path: '/api/v1/meta',
    successStatus: 200,
    summary: 'Read the curated API v1 contract catalogue',
    tag: 'Meta',
  },
  {
    auth: 'PUBLIC',
    errorEnvelope: 'HEALTH_STATUS',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_APPLICABLE' },
    method: 'GET',
    operationId: 'getPortalReadiness',
    pagination: { mode: 'NONE' },
    path: '/api/v1/health',
    successStatus: 200,
    summary: 'Read database and local integration readiness',
    tag: 'Health',
  },
  {
    auth: 'PUBLIC',
    errorEnvelope: 'NONE',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_APPLICABLE' },
    method: 'GET',
    operationId: 'getPortalLiveness',
    pagination: { mode: 'NONE' },
    path: '/api/v1/health/live',
    successStatus: 200,
    summary: 'Read process liveness without a database dependency',
    tag: 'Health',
  },
  {
    auth: 'CUSTOMER_SESSION',
    errorEnvelope: 'MESSAGE_ONLY',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_APPLICABLE' },
    method: 'GET',
    operationId: 'exportCustomerAccountData',
    pagination: { mode: 'NONE' },
    path: '/api/v1/account/export',
    successStatus: 200,
    summary: 'Download the signed-in customer account archive',
    tag: 'Account',
  },
  {
    auth: 'CUSTOMER_SESSION',
    errorEnvelope: 'MESSAGE_ONLY',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_SUPPORTED' },
    method: 'POST',
    operationId: 'createCustomerSupportCase',
    pagination: { mode: 'NONE' },
    path: '/api/v1/account/support',
    successStatus: 201,
    summary: 'Create a human-reviewed customer support case',
    tag: 'Account',
  },
  {
    auth: 'TRAVEL_AGENCY_ADMIN',
    errorEnvelope: 'MESSAGE_ONLY',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_APPLICABLE' },
    method: 'GET',
    operationId: 'listAgencyCustomers',
    pagination: { maximumLimit: 100, mode: 'FIXED_LIMIT' },
    path: '/api/v1/agent/customers',
    successStatus: 200,
    summary: 'List up to 100 customers owned by the travel agency',
    tag: 'Agency',
  },
  {
    auth: 'TRAVEL_AGENCY_ADMIN',
    errorEnvelope: 'MESSAGE_ONLY',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_SUPPORTED' },
    method: 'POST',
    operationId: 'createAgencyCustomer',
    pagination: { mode: 'NONE' },
    path: '/api/v1/agent/customers',
    successStatus: 201,
    summary: 'Create an agency-scoped customer profile',
    tag: 'Agency',
  },
  {
    auth: 'TRAVEL_AGENCY_ADMIN',
    errorEnvelope: 'MESSAGE_ONLY',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { header: 'Idempotency-Key', mode: 'REQUIRED' },
    method: 'POST',
    operationId: 'createAgencyTravelRequest',
    pagination: { mode: 'NONE' },
    path: '/api/v1/agent/travel-requests',
    successStatus: 201,
    summary: 'Create an idempotent agency customer travel request',
    tag: 'Agency',
  },
  {
    auth: 'PUBLIC',
    errorEnvelope: 'CODE_MESSAGE',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_SUPPORTED' },
    method: 'POST',
    operationId: 'interpretHotelDiscoveryIntent',
    pagination: { mode: 'NONE' },
    path: '/api/v1/hotels/discovery',
    successStatus: 200,
    summary: 'Interpret bounded hotel discovery criteria locally',
    tag: 'Hotels',
  },
  {
    auth: 'PUBLIC',
    errorEnvelope: 'CODE_MESSAGE',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_SUPPORTED' },
    method: 'POST',
    operationId: 'createHotelQuote',
    pagination: { mode: 'NONE' },
    path: '/api/v1/hotels/quotes',
    successStatus: 201,
    summary: 'Create a bounded local hotel quote and room hold',
    tag: 'Hotels',
  },
  {
    auth: 'OPTIONAL_SESSION',
    errorEnvelope: 'CODE_MESSAGE',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { header: 'Idempotency-Key', mode: 'REQUIRED' },
    method: 'POST',
    operationId: 'createHotelBooking',
    pagination: { mode: 'NONE' },
    path: '/api/v1/hotels/bookings',
    successStatus: 201,
    summary: 'Confirm a locally validated hotel booking retry-safely',
    tag: 'Hotels',
  },
  {
    auth: 'PUBLIC',
    errorEnvelope: 'CODE_MESSAGE',
    fulfillment: 'LOCAL_PORTAL_ONLY',
    idempotency: { mode: 'NOT_SUPPORTED' },
    method: 'POST',
    operationId: 'validatePromotion',
    pagination: { mode: 'NONE' },
    path: '/api/v1/promotions/validate',
    successStatus: 200,
    summary: 'Validate a governed local promotion rule',
    tag: 'Promotions',
  },
] as const satisfies readonly ApiV1SupportedOperation[];

export const API_V1_CONTRACT = {
  apiVersion: 'v1',
  basePath: '/api/v1',
  contractRevision: API_V1_CONTRACT_REVISION,
  coverage: 'CURATED_SUPPORTED_LOCAL_SUBSET',
  coverageStatement:
    'Only the listed local portal contracts are covered. Unlisted routes are not declared supported by this catalogue.',
  excludedSurface:
    'Provider-activated fulfillment, payment webhooks, internal workers, credentials, and unlisted administrative or partner mutations are excluded.',
  operations: API_V1_SUPPORTED_OPERATIONS,
  product: 'Mandyal Travels API',
} as const;
