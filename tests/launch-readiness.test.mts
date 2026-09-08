import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessLaunchReadiness,
  LAUNCH_READINESS_GATE_COUNT,
  launchReadinessEnvironmentKeys,
} from '../lib/operations/launchReadiness.ts';

function evidence(overrides = {}) {
  return {
    administratorMfa: false,
    completedAutomationJobs: new Set<string>(),
    configuredEnvironmentKeys: new Set<string>(),
    verifiedSupplierCount: 0,
    ...overrides,
  };
}

test('launch register contains exactly 20 unique, fail-closed gates', () => {
  const gates = assessLaunchReadiness(evidence());
  assert.equal(LAUNCH_READINESS_GATE_COUNT, 20);
  assert.equal(gates.length, 20);
  assert.equal(new Set(gates.map((gate) => gate.id)).size, 20);
  assert.equal(
    gates.some((gate) => gate.status === 'READY'),
    false,
  );
});

test('technical evidence marks only matching gates ready', () => {
  const gates = assessLaunchReadiness(
    evidence({
      administratorMfa: true,
      completedAutomationJobs: new Set(['DATABASE_RESTORE_VERIFICATION_V1']),
      configuredEnvironmentKeys: new Set([
        'EMAIL_BOUNCE_WEBHOOK_SECRET',
        'EMAIL_DOMAIN_AUTH_VERIFIED_AT',
      ]),
      verifiedSupplierCount: 1,
    }),
  );
  const ready = gates.filter((gate) => gate.status === 'READY').map((gate) => gate.id);
  assert.deepEqual(ready, [
    'administrator-mfa',
    'database-restore-drill',
    'email-deliverability',
    'verified-supplier',
  ]);
});

test('external approvals cannot be inferred from unrelated technical configuration', () => {
  const gates = assessLaunchReadiness(
    evidence({ configuredEnvironmentKeys: new Set(launchReadinessEnvironmentKeys()) }),
  );
  assert.equal(gates.find((gate) => gate.id === 'legal-approval')?.status, 'EXTERNAL_APPROVAL');
  assert.equal(gates.find((gate) => gate.id === 'tax-approval')?.status, 'EXTERNAL_APPROVAL');
  assert.equal(gates.find((gate) => gate.id === 'supplier-contract')?.status, 'EXTERNAL_APPROVAL');
});

test('the register exposes configuration presence only and never secret values', () => {
  const serialized = JSON.stringify(
    assessLaunchReadiness(
      evidence({ configuredEnvironmentKeys: new Set(launchReadinessEnvironmentKeys()) }),
    ),
  );
  assert.doesNotMatch(
    serialized,
    /api[_-]?key\s*[:=]|client[_-]?secret\s*[:=]|merchant[_-]?salt\s*[:=]/i,
  );
});
