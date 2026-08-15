import process from 'node:process';

import 'dotenv/config';

const failures = [];
if (!process.env.DATABASE_URL) failures.push('DATABASE_URL is required.');
if ((process.env.DATABASE_URL ?? '').startsWith('file:')) {
  failures.push('Production DATABASE_URL must use a managed relational database, not SQLite.');
}
for (const name of ['BOOKING_TOKEN_SECRET', 'PARTNER_ADMIN_KEY', 'MFA_ENCRYPTION_KEY']) {
  const value = process.env[name] ?? '';
  if (value.length < 32) failures.push(`${name} must contain at least 32 characters.`);
  if (/replace|example|change-me/i.test(value))
    failures.push(`${name} still contains a placeholder value.`);
}
if (process.env.PAYMENT_GATEWAY_MODE !== 'live')
  failures.push('PAYMENT_GATEWAY_MODE must be live.');
for (const name of [
  'PAYMENT_GATEWAY_ENDPOINT',
  'PAYMENT_GATEWAY_API_KEY',
  'PAYMENT_WEBHOOK_SECRET',
]) {
  if (!(process.env[name] ?? '').trim())
    failures.push(`${name} is required for production checkout.`);
}
if (
  !['postgresql:', 'postgres:'].some((prefix) =>
    (process.env.DATABASE_URL ?? '').startsWith(prefix),
  )
) {
  failures.push('Production DATABASE_URL must use PostgreSQL.');
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
