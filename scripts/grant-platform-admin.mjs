import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import path from 'node:path';

import Database from 'better-sqlite3';

const email = process.argv[2]?.trim().toLowerCase();
const confirmation = process.argv.find((argument) => argument.startsWith('--confirm='))?.slice(10);
const expectedConfirmation = email ? `GRANT_PLATFORM_ADMIN:${email}` : '';

if (!email || !email.includes('@') || confirmation !== expectedConfirmation) {
  console.error(
    'Usage: npm run admin:grant -- administrator@example.com --confirm=GRANT_PLATFORM_ADMIN:administrator@example.com\n' +
      'This offline-only command requires a separate active customer account and revokes its existing sessions.',
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
      .prepare('SELECT id, email, role, accessStatus FROM User WHERE lower(email) = ?')
      .get(email);

    if (!user) {
      throw new Error('No existing Mandyal Travels account uses that email address.');
    }
    if (user.role !== 'CUSTOMER' && user.role !== 'PLATFORM_ADMIN') {
      throw new Error(
        'Use a separate customer account so business and partner access stay segregated from platform operations.',
      );
    }
    if (user.accessStatus !== 'ACTIVE') {
      throw new Error('Restore this customer account before granting platform access.');
    }
    if (user.role === 'PLATFORM_ADMIN') {
      console.log(`${user.email} is already a platform administrator.`);
    } else {
      const grant = database.transaction(() => {
        const now = new Date().toISOString();
        const updated = database
          .prepare(
            `UPDATE User
             SET role = 'PLATFORM_ADMIN', updatedAt = ?
             WHERE id = ?
               AND role = 'CUSTOMER'
               AND accessStatus = 'ACTIVE'
               AND NOT EXISTS (SELECT 1 FROM OrganizationMember WHERE userId = User.id)
               AND NOT EXISTS (SELECT 1 FROM SupplyPartnerMember WHERE userId = User.id)`,
          )
          .run(now, user.id);
        if (updated.changes !== 1) {
          throw new Error(
            'The account changed or has organization/partner membership. Use a separate customer account.',
          );
        }
        database.prepare('DELETE FROM UserSession WHERE userId = ?').run(user.id);
        database
          .prepare(
            'INSERT INTO AccountSecurityEvent (id, userId, action, summary, createdAt) VALUES (?, ?, ?, ?, ?)',
          )
          .run(
            randomUUID(),
            user.id,
            'PLATFORM_ADMIN_GRANTED',
            'Platform administrator access was granted by the offline provisioning command.',
            now,
          );
      });
      grant.immediate();
      console.log(`Platform administrator access granted to ${user.email}.`);
    }
  } finally {
    database.close();
  }
}
