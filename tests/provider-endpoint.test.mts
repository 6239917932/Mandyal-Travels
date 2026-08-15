import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '../lib/integrations/providerEndpoint.ts';

test('provider endpoints require HTTPS and an explicit host allow-list', () => {
  const hosts = ['gds.example.com'];
  assert.equal(isAllowedProviderEndpoint('https://api.gds.example.com/v1/offers', hosts), true);
  assert.equal(isAllowedProviderEndpoint('https://evil-example.com/v1', hosts), false);
  assert.equal(isAllowedProviderEndpoint('http://api.gds.example.com/v1', hosts), false);
  assert.equal(isAllowedProviderEndpoint('https://localhost/v1', hosts), false);
  assert.equal(isAllowedProviderEndpoint('https://127.0.0.1/v1', ['127.0.0.1']), false);
  assert.equal(isAllowedProviderEndpoint('https://user:secret@gds.example.com/v1', hosts), false);
  assert.equal(isAllowedProviderEndpoint('https://gds.example.com:8443/v1', hosts), false);
});

test('provider host configuration is normalized and rejects local or malformed hosts', () => {
  assert.deepEqual(
    parseAllowedProviderHosts(' GDS.EXAMPLE.COM,api.example.com.,gds.example.com '),
    ['gds.example.com', 'api.example.com'],
  );
  assert.deepEqual(parseAllowedProviderHosts('localhost,127.0.0.1,com,invalid host'), []);
});
