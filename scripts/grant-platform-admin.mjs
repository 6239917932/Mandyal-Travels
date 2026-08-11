import 'dotenv/config';

import path from 'node:path';

import Database from 'better-sqlite3';

const email = process.argv[2]?.trim().toLowerCase();
const confirmed = process.argv.includes('--confirm');

if (!email || !email.includes('@') || !confirmed) {
  console.error(
    'Usage: npm run admin:grant -- administrator@example.com --confirm\n' +
      'Use a separate existing customer account. Business administrator accounts are not replaced.',
  );
  process.exitCode = 1;
} else {
  const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Platform administrator provisioning currently supports the SQLite database.');
  }

  const configuredPath = databaseUrl.slice('file:'.length);
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
  const database = new Database(databasePath);

  try {
    const user = database
      .prepare('SELECT id, email, role FROM User WHERE lower(email) = ?')
      .get(email);

    if (!user) {
      throw new Error('No existing Mandyal Travels account uses that email address.');
    }
    if (user.role === 'BUSINESS_ADMIN') {
      throw new Error(
        'Use a separate customer account so company administration stays segregated from platform operations.',
      );
    }
    if (user.role === 'PLATFORM_ADMIN') {
      console.log(`${user.email} is already a platform administrator.`);
    } else {
      database
        .prepare("UPDATE User SET role = 'PLATFORM_ADMIN', updatedAt = ? WHERE id = ?")
        .run(new Date().toISOString(), user.id);
      console.log(`Platform administrator access granted to ${user.email}.`);
    }
  } finally {
    database.close();
  }
}
