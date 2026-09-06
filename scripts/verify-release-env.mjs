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
  'SESSION_SECRET',
  'PARTNER_ADMIN_KEY',
  'MFA_ENCRYPTION_KEY',
  'NOTIFICATION_WORKER_SECRET',
  'AUTOPILOT_WORKER_SECRET',
  'INTEGRATION_OUTBOX_WORKER_SECRET',
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
  'PAYMENT_PROVIDER_ID',
  'PAYMENT_PROVIDER_ALLOWED_HOSTS',
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
if (process.env.PAYMENT_PROVIDER_ID === 'payu') {
  for (const name of [
    'PAYU_CLIENT_ID',
    'PAYU_CLIENT_SECRET',
    'PAYU_MERCHANT_ID',
    'PAYU_MERCHANT_KEY',
    'PAYU_MERCHANT_SALT',
    'PAYU_OAUTH_ENDPOINT',
    'PAYU_PAYMENT_LINK_ENDPOINT',
    'PAYU_COMMAND_ENDPOINT',
  ]) {
    const value = process.env[name] ?? '';
    if (!value.trim()) failures.push(`${name} is required for PayU live collection.`);
    if (/replace|example|change-me/i.test(value))
      failures.push(`${name} still contains a placeholder value.`);
  }
  if ((process.env.PAYU_CLIENT_SECRET ?? '').length < 16)
    failures.push('PAYU_CLIENT_SECRET must contain at least 16 characters.');
  if ((process.env.PAYU_MERCHANT_SALT ?? '').length < 8)
    failures.push('PAYU_MERCHANT_SALT must contain at least 8 characters.');
} else {
  for (const name of [
    'PAYMENT_GATEWAY_ENDPOINT',
    'PAYMENT_GATEWAY_API_KEY',
    'PAYMENT_WEBHOOK_SECRET',
  ]) {
    if (!(process.env[name] ?? '').trim())
      failures.push(`${name} is required for production money movement.`);
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
}
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
const integrationApiKey = process.env.INTEGRATION_OUTBOX_API_KEY ?? '';
if (integrationApiKey.length < 16)
  failures.push('INTEGRATION_OUTBOX_API_KEY must contain at least 16 characters.');
if (/replace|example|change-me/i.test(integrationApiKey))
  failures.push('INTEGRATION_OUTBOX_API_KEY still contains a placeholder value.');
for (const name of ['INTEGRATION_OUTBOX_ENDPOINT', 'INTEGRATION_OUTBOX_ALLOWED_HOSTS']) {
  if (!(process.env[name] ?? '').trim())
    failures.push(`${name} is required for production integration delivery.`);
}

for (const [endpointName, hostsName] of [
  ['PAYMENT_GATEWAY_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYMENT_GATEWAY_REFUND_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYU_OAUTH_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYU_PAYMENT_LINK_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYU_COMMAND_ENDPOINT', 'PAYMENT_PROVIDER_ALLOWED_HOSTS'],
  ['PAYOUT_PROVIDER_ENDPOINT', 'PAYOUT_PROVIDER_ALLOWED_HOSTS'],
  ['MEDIA_SIGNING_ENDPOINT', 'MEDIA_PROVIDER_ALLOWED_HOSTS'],
  ['EMAIL_PROVIDER_ENDPOINT', 'EMAIL_PROVIDER_ALLOWED_HOSTS'],
  ['MOBILE_MESSAGING_ENDPOINT', 'MOBILE_MESSAGING_ALLOWED_HOSTS'],
  ['PUSH_PROVIDER_ENDPOINT', 'PUSH_PROVIDER_ALLOWED_HOSTS'],
  ['INTEGRATION_OUTBOX_ENDPOINT', 'INTEGRATION_OUTBOX_ALLOWED_HOSTS'],
]) {
  endpointUsesAllowedHost(endpointName, hostsName);
}
if (process.env.AUTH_EMAIL_OTP_REQUIRED === 'true') {
  const smtpHost = (process.env.EMAIL_SMTP_HOST ?? '').trim().toLowerCase();
  const smtpAllowedHosts = parseAllowedHosts(process.env.EMAIL_SMTP_ALLOWED_HOSTS);
  const smtpConfigured = Boolean(
    smtpHost || process.env.EMAIL_SMTP_USER || process.env.EMAIL_SMTP_PASSWORD,
  );
  if (!(process.env.EMAIL_FROM_ADDRESS ?? '').trim()) {
    failures.push('EMAIL_FROM_ADDRESS is required when email OTP is mandatory.');
  }
  if (smtpConfigured) {
    if (!isPublicDomainName(smtpHost) || !smtpAllowedHosts.includes(smtpHost)) {
      failures.push(
        'EMAIL_SMTP_HOST must exactly match an approved EMAIL_SMTP_ALLOWED_HOSTS entry.',
      );
    }
    if (process.env.EMAIL_SMTP_PORT !== '465') {
      failures.push('EMAIL_SMTP_PORT must be 465 for implicit TLS.');
    }
    if (!(process.env.EMAIL_SMTP_USER ?? '').trim() || !(process.env.EMAIL_SMTP_PASSWORD ?? '')) {
      failures.push('EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD are required for SMTP email OTP.');
    }
  } else if (
    !(process.env.EMAIL_PROVIDER_ENDPOINT ?? '').trim() ||
    !(process.env.EMAIL_PROVIDER_API_KEY ?? '').trim()
  ) {
    failures.push(
      'A configured SMTP or HTTPS email provider is required when email OTP is mandatory.',
    );
  }
}
if (process.env.NODE_ENV !== 'production')
  failures.push('NODE_ENV must be production for a release deployment.');
if (process.env.FIXTURE_INVENTORY_ENABLED === 'true')
  failures.push('FIXTURE_INVENTORY_ENABLED must not be true in production.');

if (failures.length) {
  console.error('Release environment verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Release environment verification passed.');
}
