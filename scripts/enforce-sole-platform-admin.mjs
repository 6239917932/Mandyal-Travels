import { randomUUID } from 'node:crypto';
import process from 'node:process';

import pg from 'pg';

import { postgreSqlClientOptions } from './lib/postgresql-client-options.mjs';

const email = process.env.SOLE_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();

if (!email) process.exit(0);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('SOLE_PLATFORM_ADMIN_EMAIL_INVALID');
}

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl || !/^postgres(?:ql)?:/i.test(databaseUrl)) {
  throw new Error('SOLE_PLATFORM_ADMIN_DATABASE_REQUIRED');
}

const client = new pg.Client(postgreSqlClientOptions(databaseUrl));

try {
  await client.connect();
  await client.query('BEGIN');

  const targetResult = await client.query(
    `SELECT id, role, "accessStatus"
       FROM "User"
      WHERE lower(email) = $1
      FOR UPDATE`,
    [email],
  );
  if (targetResult.rowCount !== 1) throw new Error('SOLE_PLATFORM_ADMIN_ACCOUNT_NOT_FOUND');

  const target = targetResult.rows[0];
  if (target.accessStatus !== 'ACTIVE') throw new Error('SOLE_PLATFORM_ADMIN_ACCOUNT_NOT_ACTIVE');
  if (!['CUSTOMER', 'PLATFORM_ADMIN'].includes(target.role)) {
    throw new Error('SOLE_PLATFORM_ADMIN_ACCOUNT_ROLE_CONFLICT');
  }

  const membershipResult = await client.query(
    `SELECT
       EXISTS (SELECT 1 FROM "OrganizationMember" WHERE "userId" = $1) AS organization,
       EXISTS (SELECT 1 FROM "SupplyPartnerMember" WHERE "userId" = $1) AS partner`,
    [target.id],
  );
  if (membershipResult.rows[0]?.organization || membershipResult.rows[0]?.partner) {
    throw new Error('SOLE_PLATFORM_ADMIN_ACCOUNT_MEMBERSHIP_CONFLICT');
  }

  const otherAdmins = await client.query(
    `SELECT id
       FROM "User"
      WHERE role = 'PLATFORM_ADMIN'
        AND id <> $1
      FOR UPDATE`,
    [target.id],
  );
  const changedUserIds = otherAdmins.rows.map((row) => row.id);

  if (target.role !== 'PLATFORM_ADMIN') {
    await client.query(
      `UPDATE "User"
          SET role = 'PLATFORM_ADMIN',
              "accessVersion" = "accessVersion" + 1,
              "accessChangedAt" = NOW(),
              "updatedAt" = NOW()
        WHERE id = $1`,
      [target.id],
    );
    changedUserIds.push(target.id);
    await client.query(
      `INSERT INTO "AccountSecurityEvent" (id, "userId", action, summary, "createdAt")
       VALUES ($1, $2, 'PLATFORM_ADMIN_GRANTED', $3, NOW())`,
      [
        randomUUID(),
        target.id,
        'Platform administrator access was granted by the protected deployment configuration.',
      ],
    );
  }

  if (otherAdmins.rowCount > 0) {
    await client.query(
      `UPDATE "User"
          SET role = 'CUSTOMER',
              "accessVersion" = "accessVersion" + 1,
              "accessChangedAt" = NOW(),
              "updatedAt" = NOW()
        WHERE role = 'PLATFORM_ADMIN'
          AND id <> $1`,
      [target.id],
    );
    for (const row of otherAdmins.rows) {
      await client.query(
        `INSERT INTO "AccountSecurityEvent" (id, "userId", action, summary, "createdAt")
         VALUES ($1, $2, 'PLATFORM_ADMIN_REVOKED', $3, NOW())`,
        [
          randomUUID(),
          row.id,
          'Platform administrator access was revoked by the protected deployment configuration.',
        ],
      );
    }
  }

  if (changedUserIds.length > 0) {
    await client.query(`DELETE FROM "UserSession" WHERE "userId" = ANY($1::text[])`, [
      changedUserIds,
    ]);
  }

  const finalCount = await client.query(
    `SELECT count(*)::int AS count
       FROM "User"
      WHERE role = 'PLATFORM_ADMIN'
        AND "accessStatus" = 'ACTIVE'`,
  );
  if (finalCount.rows[0]?.count !== 1) throw new Error('SOLE_PLATFORM_ADMIN_INVARIANT_FAILED');

  await client.query('COMMIT');
  console.log('Sole platform administrator configuration verified.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
