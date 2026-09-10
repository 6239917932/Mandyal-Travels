import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('HR readiness uses named partner membership and existing security evidence', async () => {
  const [page, service] = await Promise.all([
    readFile(new URL('../app/partner/pms/hr-readiness/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerHrReadinessService.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /memberRole !== 'ADMIN'/);
  assert.match(page, /href="\/partner\/access"/);
  assert.match(page, /href="\/partner\/activity"/);
  assert.match(service, /supplyPartnerMember\.findMany/);
  assert.match(service, /mfaCredential/);
  assert.match(service, /partnerAuditEntries/);
  assert.match(service, /where: \{ partnerId: input\.partnerId \}/);
  assert.match(service, /take: MAX_STAFF \+ 1/);
});

test('HR readiness cannot write payroll, salary or staff records', async () => {
  const [page, service] = await Promise.all([
    readFile(new URL('../app/partner/pms/hr-readiness/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerHrReadinessService.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /does not\s+store salary/i);
  assert.match(page, /generate payslips/);
  assert.match(page, /transmit payroll payments/);
  assert.match(page, /None of these records are inferred from PMS access membership/);
  assert.doesNotMatch(
    service,
    /prisma\.[A-Za-z]+\.(?:create|update|delete)\(|transaction\.[A-Za-z]+\.(?:create|update|delete)\(/,
  );
});

test('HR readiness withholds completeness after its bounded staff limit', async () => {
  const [page, service] = await Promise.all([
    readFile(new URL('../app/partner/pms/hr-readiness/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../services/partnerHrReadinessService.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(service, /safetyLimitReached: members\.length > MAX_STAFF/);
  assert.match(page, /This roster is incomplete/);
  assert.match(page, /paginated\s+access directory/);
});
