import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedProviderEndpoint } from '../lib/integrations/providerEndpoint.ts';

test('provider endpoints require HTTPS and an explicit host allow-list', () => {
  const hosts = ['gds.example.com'];
  assert.equal(isAllowedProviderEndpoint('https://api.gds.example.com/v1/offers', hosts), true);
  assert.equal(isAllowedProviderEndpoint('https://evil-example.com/v1', hosts), false);
  assert.equal(isAllowedProviderEndpoint('http://api.gds.example.com/v1', hosts), false);
  assert.equal(isAllowedProviderEndpoint('https://localhost/v1', hosts), false);
});
