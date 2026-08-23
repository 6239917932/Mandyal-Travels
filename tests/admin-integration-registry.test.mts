import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasConfiguredSecret,
  integrationPosture,
  integrationPostureLabel,
} from '../services/adminIntegrationRegistryService.ts';

test('integration posture requires both an enabled connection and healthy provider state', () => {
  assert.equal(integrationPosture('ACTIVE', 'HEALTHY'), 'READY');
  assert.equal(integrationPosture('CONNECTED', 'OK'), 'READY');
  assert.equal(integrationPosture('DRAFT', 'NOT_TESTED'), 'SETUP_REQUIRED');
  assert.equal(integrationPosture('ACTIVE', 'NOT_CHECKED'), 'SETUP_REQUIRED');
});

test('integration failures take precedence over otherwise active configuration', () => {
  assert.equal(integrationPosture('ACTIVE', 'FAILED'), 'ATTENTION');
  assert.equal(integrationPosture('SUSPENDED', 'HEALTHY'), 'ATTENTION');
  assert.equal(integrationPosture('ERROR', 'NOT_CHECKED'), 'ATTENTION');
});

test('secret references are reduced to configuration presence and never returned', () => {
  const secretReference = 'vault://production/supplier/private-key';
  assert.equal(hasConfiguredSecret(secretReference), true);
  assert.equal(hasConfiguredSecret('   '), false);
  assert.equal(typeof hasConfiguredSecret(secretReference), 'boolean');
});

test('integration posture labels are suitable for operator-facing status text', () => {
  assert.equal(integrationPostureLabel('READY'), 'Ready');
  assert.equal(integrationPostureLabel('ATTENTION'), 'Needs attention');
  assert.equal(integrationPostureLabel('SETUP_REQUIRED'), 'Setup required');
});
