import process from 'node:process';

import 'dotenv/config';

const failures = [];
if (!process.env.DATABASE_URL) failures.push('DATABASE_URL is required.');
for (const name of ['BOOKING_TOKEN_SECRET', 'PARTNER_ADMIN_KEY']) {
  const value = process.env[name] ?? '';
  if (value.length < 32) failures.push(`${name} must contain at least 32 characters.`);
  if (/replace|example|change-me/i.test(value)) failures.push(`${name} still contains a placeholder value.`);
}
if (process.env.NODE_ENV !== 'production') failures.push('NODE_ENV must be production for a release deployment.');

if (failures.length) {
  console.error('Release environment verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Release environment verification passed.');
}
