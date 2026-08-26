import process from 'node:process';
import { isIP } from 'node:net';

import 'dotenv/config';

import { validateProductionDatabaseContract } from './lib/production-database-contract.mjs';

const failures = [];
failures.push(...validateProductionDatabaseContract(process.env));
const HOST_PATTERN = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)*[a-z0-9][a-z0-9-]{0,62}$/;

function isPublicDomainName(host) {
  return (
    HOST_PATTERN.test(host) &&
    host.includes('.') &&
    !host.includes('..') &&
    host !== 'localhost' &&
    !host.endsWith('.localhost') &&
    !host.endsWith('.local') &&
    isIP(host) === 0
  );
}

function parseAllowedHosts(value) {
  return (value ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ''))
    .filter(isPublicDomainName);
}

function endpointUsesAllowedHost(endpointName, hostsName) {
  const endpointValue = (process.env[endpointName] ?? '').trim();
  if (!endpointValue) return;
  const allowedHosts = parseAllowedHosts(process.env[hostsName]);
  if (!allowedHosts.length) {
    failures.push(`${hostsName} must explicitly list the approved provider hosts.`);
    return;
  }
  try {
    const url = new URL(endpointValue);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      !allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    ) {
      failures.push(`${endpointName} must use HTTPS on an approved ${hostsName} host.`);
    }
  } catch {
    failures.push(`${endpointName} must contain a valid absolute URL.`);
  }
}

for (const name of [
  'BOOKING_TOKEN_SECRET',
  'PARTNER_ADMIN_KEY',
  'MFA_ENCRYPTION_KEY',
  'NOTIFICATION_WORKER_SECRET',
  'AUTOPILOT_WORKER_SECRET',
]) {
  const value = process.env[name] ?? '';
  if (value.length < 32) failures.push(`${name} must contain at least 32 characters.`);
  if (/replace|example|change-me/i.test(value))
    failures.push(`${name} still contains a placeholder value.`);
}
if (process.env.PAYMENT_GATEWAY_MODE !== 'live')
  failures.push('PAYMENT_GATEWAY_MODE must be live.');
for (const name of [
  'PUBLIC_APP_ORIGIN',
  'PAYMENT_GATEWAY_ENDPOINT',
  'PAYMENT_GATEWAY_API_KEY',
  'PAYMENT_PROVIDER_ID',
  'PAYMENT_PROVIDER_ALLOWED_HOSTS',
  'PAYMENT_WEBHOOK_SECRET',
  'PAYOUT_PROVIDER_ID',
  'PAYOUT_PROVIDER_ENDPOINT',
  'PAYOUT_PROVIDER_API_KEY',
  'PAYOUT_PROVIDER_ALLOWED_HOSTS',
]) {
  if (!(process.env[name] ?? '').trim())
    failures.push(`${name} is required for production money movement.`);
}
try {
  const publicOrigin = new URL(process.env.PUBLIC_APP_ORIGIN ?? '');
  if (
    publicOrigin.protocol !== 'https:' ||
    publicOrigin.username ||
    publicOrigin.password ||
    publicOrigin.pathname !== '/' ||
    publicOrigin.search ||
    publicOrigin.hash
  ) {
    failures.push('PUBLIC_APP_ORIGIN must be an HTTPS origin without a path or credentials.');
  }
} catch {
  failures.push('PUBLIC_APP_ORIGIN must contain a valid absolute HTTPS origin.');
}
const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? '';
if (webhookSecret.length < 32)
  failures.push('PAYMENT_WEBHOOK_SECRET must contain at least 32 characters.');
if (/replace|example|change-me/i.test(webhookSecret))
  failures.push('PAYMENT_WEBHOOK_SECRET still contains a placeholder value.');
const paymentApiKey = process.env.PAYMENT_GATEWAY_API_KEY ?? '';
if (paymentApiKey.length < 16)
  failures.push('PAYMENT_GATEWAY_API_KEY must contain at least 16 characters.');
if (/replace|example|change-me/i.test(paymentApiKey))
  failures.push('PAYMENT_GATEWAY_API_KEY still contains a placeholder value.');
for (const name of ['PAYMENT_PROVIDER_ID', 'PAYOUT_PROVIDER_ID']) {
  const value = process.env[name] ?? '';
  if (!/^[a-z0-9][a-z0-9_-]{0,49}$/.test(value) || /configured|example|replace/i.test(value)) {
    failures.push(`${name} must identify the real configured provider.`);
  }
}
const payoutApiKey = process.env.PAYOUT_PROVIDER_API_KEY ?? '';
if (payoutApiKey.length < 16)
  failures.push('PAYOUT_PROVIDER_API_KEY must contain at least 16 characters.');
if (/replace|example|change-me/i.test(payoutApiKey))
  failures.push('PAYOUT_PROVIDER_API_KEY still contains a placeholder value.');

for (const [endpointName, hostsName] of [
  ['PAYMENT_GATEWAY_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYMENT_GATEWAY_REFUND_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYOUT_PROVIDER_ENDPOINT', 'PAYOUT_PROVIDER_ALLOWED_HOSTS'],
  ['MEDIA_SIGNING_ENDPOINT', 'MEDIA_PROVIDER_ALLOWED_HOSTS'],
  ['EMAIL_PROVIDER_ENDPOINT', 'EMAIL_PROVIDER_ALLOWED_HOSTS'],
  ['MOBILE_MESSAGING_ENDPOINT', 'MOBILE_MESSAGING_ALLOWED_HOSTS'],
  ['PUSH_PROVIDER_ENDPOINT', 'PUSH_PROVIDER_ALLOWED_HOSTS'],
]) {
  endpointUsesAllowedHost(endpointName, hostsName);
}
if (process.env.NODE_ENV !== 'production')
  failures.push('NODE_ENV must be production for a release deployment.');

if (failures.length) {
  console.error('Release environment verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Release environment verification passed.');
}
