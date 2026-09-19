import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.ts';
import {
  inquiryActionsForStatus,
  inquiryStatuses,
  inquiryTargetStatus,
  parseInquiryDecision,
} from '../lib/admin/contactInquiryRules.ts';
import { reviewContactInquiry } from '../lib/admin/contactInquiryStore.ts';

test('request review validates decisions, bounded notes and revision numbers', () => {
  assert.deepEqual(
    parseInquiryDecision({ action: 'ACCEPT', reason: '  Owner contacted  ', expectedVersion: 1 }),
    { action: 'ACCEPT', reason: 'Owner contacted', expectedVersion: 1 },
  );
  for (const action of ['APPROVE_SUPPLIER', '', null])
    assert.throws(
      () => parseInquiryDecision({ action, reason: 'Enough text', expectedVersion: 1 }),
      /ACTION_INVALID/,
    );
  for (const expectedVersion of [0, -1, 1.5, '1', Infinity, null])
    assert.throws(
      () => parseInquiryDecision({ action: 'ACCEPT', reason: 'Enough text', expectedVersion }),
      /VERSION_REQUIRED/,
    );
  for (const reason of ['', 'tiny', 'x'.repeat(1001), null])
    assert.throws(
      () => parseInquiryDecision({ action: 'ACCEPT', reason, expectedVersion: 1 }),
      /REASON_REQUIRED/,
    );
});

test('closed or rejected requests must be reopened before another decision', () => {
  for (const status of inquiryStatuses)
    for (const action of inquiryActionsForStatus(status))
      assert.ok(
        inquiryStatuses.includes(
          inquiryTargetStatus(status, action) as (typeof inquiryStatuses)[number],
        ),
      );
  assert.deepEqual(inquiryActionsForStatus('CLOSED'), ['REOPEN']);
  assert.deepEqual(inquiryActionsForStatus('REJECTED'), ['REOPEN']);
  assert.deepEqual(inquiryActionsForStatus('UNKNOWN'), []);
  assert.throws(() => inquiryTargetStatus('ACCEPTED', 'REJECT'), /TRANSITION_INVALID/);
  assert.throws(() => inquiryTargetStatus('REJECTED', 'ACCEPT'), /TRANSITION_INVALID/);
});

test('request decisions persist atomically, reject stale writes and never grant supplier access', async (t) => {
  const database = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file::memory:' }) });
  t.after(async () => database.$disconnect());
  await database.$executeRawUnsafe('CREATE TABLE "User" ("id" TEXT PRIMARY KEY)');
  await database.$executeRawUnsafe('INSERT INTO "User" ("id") VALUES (\'admin-test\')');
  await database.$executeRawUnsafe(
    'CREATE TABLE "ContactInquiry" ("id" TEXT PRIMARY KEY, "reference" TEXT UNIQUE, "name" TEXT, "email" TEXT, "phone" TEXT, "category" TEXT, "message" TEXT, "status" TEXT DEFAULT \'OPEN\', "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP)',
  );
  const migration = fs.readFileSync(
    'prisma/migrations/20260920013000_add_contact_inquiry_review/migration.sql',
    'utf8',
  );
  for (const statement of migration.split(';').filter((value) => value.trim()))
    await database.$executeRawUnsafe(statement);
  const inquiry = await database.contactInquiry.create({
    data: {
      reference: 'TEST-REQUEST',
      name: 'Test Owner',
      email: 'owner@example.invalid',
      phone: '',
      category: 'HOTEL_OWNER',
      message: 'Testing only',
    },
  });
  const decide = (
    action: 'START_REVIEW' | 'ACCEPT' | 'REJECT' | 'CLOSE' | 'REOPEN',
    expectedVersion: number,
    actorUserId = 'admin-test',
  ) =>
    reviewContactInquiry(database, {
      inquiryId: inquiry.id,
      action,
      expectedVersion,
      actorUserId,
      reason: 'Isolated test decision',
    });
  assert.equal((await decide('START_REVIEW', 1)).status, 'IN_REVIEW');
  assert.equal((await decide('ACCEPT', 2)).status, 'ACCEPTED');
  await assert.rejects(decide('REJECT', 2), /VERSION_CONFLICT/);
  await assert.rejects(decide('REJECT', 3), /TRANSITION_INVALID/);
  assert.equal(await database.contactInquiryReviewEvent.count(), 2);
  // The audit FK fails after the update; the transaction must roll back the update too.
  await assert.rejects(decide('CLOSE', 3, 'missing-actor'));
  assert.equal(
    (await database.contactInquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).version,
    3,
  );
  assert.equal((await decide('CLOSE', 3)).status, 'CLOSED');
  assert.equal((await decide('REOPEN', 4)).status, 'OPEN');
  assert.equal((await decide('REJECT', 5)).status, 'REJECTED');
  const events = await database.contactInquiryReviewEvent.findMany({ orderBy: { version: 'asc' } });
  assert.deepEqual(
    events.map((event) => event.version),
    [2, 3, 4, 5, 6],
  );
  assert.equal(events[1].fromStatus, 'IN_REVIEW');
  assert.equal(events[1].toStatus, 'ACCEPTED');
  const source = fs.readFileSync('lib/admin/contactInquiryStore.ts', 'utf8');
  assert.doesNotMatch(source, /supplyPartner|partnerApplication|user\.update|fetch\(/);
});

test('admin requests and application history have detail links and protected review endpoints', () => {
  const listing = fs.readFileSync('app/admin/contact-inquiries/page.tsx', 'utf8');
  const detail = fs.readFileSync('app/admin/contact-inquiries/[inquiryId]/page.tsx', 'utf8');
  const route = fs.readFileSync('app/api/v1/admin/contact-inquiries/[inquiryId]/route.ts', 'utf8');
  const application = fs.readFileSync(
    'app/admin/partner-applications/[applicationId]/page.tsx',
    'utf8',
  );
  assert.match(listing, /href=\{`\/admin\/contact-inquiries\/\$\{inquiry.id\}`\}/);
  assert.match(detail, /AdminContactInquiryReview/);
  assert.match(route, /getPlatformAdmin/);
  assert.match(route, /isSameOriginMutation/);
  assert.match(application, /item.status === 'PENDING'/);
  assert.match(application, /AdminPartnerKycReview/);
  const audit = fs.readFileSync('app/admin/audit/page.tsx', 'utf8');
  assert.match(audit, /prisma.contactInquiryReviewEvent.findMany/);
  const governance = fs.readFileSync('services/partnerKycGovernanceService.ts', 'utf8');
  assert.match(
    governance,
    /input.targetStatus === 'VERIFIED' && !partnerKycStorageReadiness\(\{\}\).ready/,
  );
  assert.match(
    application,
    /summary\?\.complete === true && item.signedAgreementStatus === 'RECEIVED'/,
  );
});
