export type IntegrationPosture = 'ATTENTION' | 'READY' | 'SETUP_REQUIRED';

const READY_CONNECTION_STATES = new Set(['ACTIVE', 'CONNECTED', 'ENABLED']);
const READY_HEALTH_STATES = new Set(['HEALTHY', 'OK', 'PASSING']);
const ATTENTION_STATES = new Set([
  'DEAD_LETTER',
  'DEGRADED',
  'DISABLED',
  'ERROR',
  'FAILED',
  'SUSPENDED',
  'UNHEALTHY',
]);

export function integrationPosture(status: string, healthStatus: string): IntegrationPosture {
  const connection = status.trim().toUpperCase();
  const health = healthStatus.trim().toUpperCase();
  if (ATTENTION_STATES.has(connection) || ATTENTION_STATES.has(health)) return 'ATTENTION';
  if (READY_CONNECTION_STATES.has(connection) && READY_HEALTH_STATES.has(health)) return 'READY';
  return 'SETUP_REQUIRED';
}

export function hasConfiguredSecret(reference: string) {
  return reference.trim().length > 0;
}

export function integrationPostureLabel(posture: IntegrationPosture) {
  if (posture === 'SETUP_REQUIRED') return 'Setup required';
  return posture === 'READY' ? 'Ready' : 'Needs attention';
}
