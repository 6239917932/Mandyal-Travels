// Isolated local fixture only. Never connects to the deployed database or providers.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.ts';

const databasePath = path.resolve('prisma/admin-audit-e2e.db');
if (fs.existsSync(databasePath) && fs.statSync(databasePath).size > 0)
  throw new Error('Fixture database exists. Refusing to overwrite.');
const sql = new Database(databasePath);
const migrations = fs
  .readdirSync('prisma/migrations', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
for (const migration of migrations)
  sql.exec(fs.readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
assertIntegrity();
function assertIntegrity() {
  if (
    sql.pragma('integrity_check', { simple: true }) !== 'ok' ||
    (sql.pragma('foreign_key_check') as unknown[]).length
  )
    throw new Error('Fixture migration integrity failed.');
}
sql.close();
const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${databasePath.replaceAll('\\', '/')}` }),
});
const adminToken = randomBytes(32).toString('base64url');
const customerToken = randomBytes(32).toString('base64url');
const partnerToken = randomBytes(32).toString('base64url');
try {
  for (const [id, role, token] of [
    ['audit-admin', 'PLATFORM_ADMIN', adminToken],
    ['audit-customer', 'CUSTOMER', customerToken],
    ['audit-partner', 'PARTNER', partnerToken],
  ]) {
    await db.user.create({
      data: {
        id,
        role,
        email: `${id}@example.invalid`,
        passwordHash: 'NO_PASSWORD_LOGIN_TEST_FIXTURE',
        firstName: 'Audit',
        lastName: role,
        emailVerifiedAt: new Date(),
        sessions: {
          create: {
            tokenHash: createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + 6 * 3600_000),
          },
        },
      },
    });
  }
  await db.supplyPartner.create({
    data: {
      id: 'audit-hotel',
      name: 'Isolated Audit Hotel',
      type: 'HOTEL',
      contactEmail: 'hotel@example.invalid',
    },
  });
  await db.supplyPartner.create({
    data: { id: 'audit-car', name: 'Isolated Audit Cars', type: 'CAR' },
  });
  await db.supplyPartnerMember.create({
    data: {
      id: 'audit-hotel-member',
      partnerId: 'audit-hotel',
      userId: 'audit-partner',
      role: 'ADMIN',
    },
  });
  await db.partnerProperty.create({
    data: {
      id: 'audit-property',
      partnerId: 'audit-hotel',
      hotelSlug: 'isolated-audit-hotel',
      displayName: 'Audit Hotel - Not Live',
      listingSource: 'MANAGED',
      publicationStatus: 'DRAFT',
      city: 'Mandi',
      state: 'Himachal Pradesh',
      description: 'Isolated synthetic test property. Never available for real booking.',
    },
  });
  await db.partnerVehicle.create({
    data: {
      id: 'audit-vehicle',
      partnerId: 'audit-car',
      code: 'AUDIT-CAR',
      vehicleName: 'Audit Car - Not Live',
      category: 'SEDAN',
      transmission: 'MANUAL',
      seats: 4,
      bags: 2,
      fuelPolicy: 'Included',
      mileagePolicy: 'Test',
      cancellationPolicy: 'Test only',
      pickupLocation: 'Mandi',
      dropoffLocation: 'Shimla',
      pricePerDay: 300000,
      publicationStatus: 'DRAFT',
    },
  });
  await db.organization.create({
    data: { id: 'audit-org', name: 'Isolated Audit Organization', type: 'CORPORATE' },
  });
  for (let index = 0; index < 32; index++)
    await db.contactInquiry.create({
      data: {
        id: `audit-inquiry-${index}`,
        reference: `AUDIT-${String(index).padStart(3, '0')}`,
        name: 'Test PMS Owner',
        email: 'audit-customer@example.invalid',
        phone: '',
        category: index < 31 ? 'HOTEL_OWNER' : 'GENERAL',
        message: 'Please explain your hotel PMS. Synthetic local test only.',
      },
    });
  for (const status of ['PENDING', 'REJECTED', 'APPROVED'])
    await db.partnerApplication.create({
      data: {
        id: `audit-application-${status.toLowerCase()}`,
        applicantUserId: 'audit-customer',
        businessName: `Audit Application ${status}`,
        partnerType: 'HOTEL',
        contactName: 'Test Owner',
        contactEmail: 'audit-customer@example.invalid',
        contactPhone: '0000000000',
        city: 'Mandi',
        inventorySummary: 'Synthetic application for browser tests',
        status,
        agreementVersion: 'test-only',
        agreementEmailStatus: 'SENT',
        agreementContentHash: 'test-only',
        ...(status === 'APPROVED' ? { partnerId: 'audit-hotel' } : {}),
      },
    });
  await db.partnerKycDocument.create({
    data: {
      id: 'audit-kyc',
      applicationId: 'audit-application-pending',
      documentType: 'AUTHORIZED_REPRESENTATIVE_ID',
      status: 'SUBMITTED',
    },
  });
  await db.customerTrip.create({
    data: {
      id: 'audit-trip',
      userId: 'audit-customer',
      email: 'audit-customer@example.invalid',
      productType: 'CAR',
      confirmationCode: 'AUDIT-CAR-BOOKING',
      status: 'CONFIRMED',
      title: 'Isolated car test',
      subtitle: 'Mandi to Shimla',
      startDate: '2026-10-01',
      totalAmount: 300000,
      detailsJson: '{}',
    },
  });
  await db.availabilityLock.create({
    data: {
      id: 'audit-lock',
      roomTypeId: 'audit-room',
      quantity: 1,
      inventorySource: 'direct',
      status: 'CONFIRMED',
      expiresAt: new Date(Date.now() + 86400_000),
    },
  });
  await db.hotelQuote.create({
    data: {
      id: 'audit-quote',
      availabilityLockId: 'audit-lock',
      hotelSlug: 'isolated-audit-hotel',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-02',
      currency: 'INR',
      totalAmount: 300000,
      nights: 1,
      quotedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
    },
  });
  await db.booking.create({
    data: {
      id: 'audit-booking',
      confirmationCode: 'AUDIT-HOTEL-BOOKING',
      idempotencyKey: 'audit-only',
      hotelSlug: 'isolated-audit-hotel',
      status: 'confirmed',
      totalAmount: 300000,
      currency: 'INR',
      quoteId: 'audit-quote',
      availabilityLockId: 'audit-lock',
    },
  });
  await db.hotelReview.create({
    data: {
      id: 'audit-review',
      bookingId: 'audit-booking',
      userId: 'audit-customer',
      hotelSlug: 'isolated-audit-hotel',
      rating: 4,
      title: 'Synthetic review',
      body: 'Local isolated test review; never publish to production.',
    },
  });
  await db.customerSupportCase.create({
    data: {
      id: 'audit-support',
      caseNumber: 'AUDIT-SUPPORT',
      userId: 'audit-customer',
      category: 'GENERAL',
      subject: 'Synthetic support case',
      message: 'Local test only',
    },
  });
  await db.businessSupportCase.create({
    data: {
      id: 'audit-business-support',
      caseNumber: 'AUDIT-BUSINESS',
      organizationId: 'audit-org',
      createdByUserId: 'audit-customer',
      category: 'GENERAL',
      subject: 'Synthetic corporate support',
      message: 'Local test only',
    },
  });
  await db.dataPrivacyRequest.create({
    data: {
      id: 'audit-privacy',
      userId: 'audit-customer',
      requestType: 'ACCESS',
      dueAt: new Date(Date.now() + 86400_000),
    },
  });
  fs.mkdirSync('.gh-task-cache', { recursive: true });
  fs.writeFileSync(
    '.gh-task-cache/admin-audit-fixture.json',
    JSON.stringify({
      adminToken,
      customerToken,
      partnerToken,
      databasePath,
      createdAt: new Date().toISOString(),
    }),
  );
  console.log(
    `Created isolated admin fixture database with ${migrations.length} applied migrations. Session tokens saved only in ignored local test cache.`,
  );
} finally {
  await db.$disconnect();
}
