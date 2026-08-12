import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import path from 'node:path';

import Database from 'better-sqlite3';

const [emailInput, partnerNameInput, hotelSlugsInput] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const partnerName = partnerNameInput?.trim();
const hotelSlugs = hotelSlugsInput
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const confirmed = process.argv.includes('--confirm');

if (!email || !email.includes('@') || !partnerName || !hotelSlugs?.length || !confirmed) {
  console.error(
    'Usage: npm run partner:grant -- partner@example.com "Partner name" hotel-slug[,hotel-slug] --confirm\n' +
      'The email must belong to an existing customer account. Partner access is invite-only.',
  );
  process.exitCode = 1;
} else {
  const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Partner provisioning currently supports the SQLite database.');
  }
  const configuredPath = databaseUrl.slice('file:'.length);
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
  const database = new Database(databasePath);
  const now = new Date().toISOString();

  try {
    const user = database
      .prepare('SELECT id, email, role FROM User WHERE lower(email) = ?')
      .get(email);
    if (!user) throw new Error('No existing Mandyal Travels account uses that email address.');
    if (user.role !== 'CUSTOMER' && user.role !== 'PARTNER_ADMIN') {
      throw new Error('Use a separate customer account for supplier operations.');
    }

    const provision = database.transaction(() => {
      let membership = database
        .prepare('SELECT partnerId FROM SupplyPartnerMember WHERE userId = ?')
        .get(user.id);
      let partnerId = membership?.partnerId;
      if (!partnerId) {
        partnerId = randomUUID();
        database
          .prepare(
            'INSERT INTO SupplyPartner (id, name, type, status, contactEmail, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .run(partnerId, partnerName, 'HOTEL', 'ACTIVE', email, now, now);
        database
          .prepare(
            'INSERT INTO SupplyPartnerMember (id, partnerId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)',
          )
          .run(randomUUID(), partnerId, user.id, 'ADMIN', now);
      }
      database
        .prepare("UPDATE User SET role = 'PARTNER_ADMIN', updatedAt = ? WHERE id = ?")
        .run(now, user.id);

      const existingProperty = database.prepare(
        'SELECT partnerId FROM PartnerProperty WHERE hotelSlug = ?',
      );
      const insertProperty = database.prepare(
        'INSERT INTO PartnerProperty (id, partnerId, hotelSlug, displayName, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      const updateProperty = database.prepare(
        'UPDATE PartnerProperty SET displayName = ?, status = ?, updatedAt = ? WHERE hotelSlug = ? AND partnerId = ?',
      );
      for (const hotelSlug of hotelSlugs) {
        const assignment = existingProperty.get(hotelSlug);
        if (assignment && assignment.partnerId !== partnerId) {
          throw new Error(`${hotelSlug} is already assigned to another supply partner.`);
        }
        const displayName = hotelSlug
          .split('-')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        if (assignment) {
          updateProperty.run(displayName, 'ACTIVE', now, hotelSlug, partnerId);
        } else {
          insertProperty.run(randomUUID(), partnerId, hotelSlug, displayName, 'ACTIVE', now, now);
        }
      }
      database
        .prepare(
          'INSERT INTO PartnerAuditLog (id, partnerId, actorUserId, action, entityType, entityId, summary, metadataJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          randomUUID(),
          partnerId,
          user.id,
          'PARTNER_ACCESS_PROVISIONED',
          'PARTNER',
          partnerId,
          'Partner account access and property scope provisioned.',
          JSON.stringify({ hotelSlugs }),
          now,
        );
    });
    provision();
    console.log(`Partner access granted to ${user.email} for ${hotelSlugs.join(', ')}.`);
  } finally {
    database.close();
  }
}
