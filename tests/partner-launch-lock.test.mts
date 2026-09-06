import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('launch posture blocks every partner mutation before route authorization', async () => {
  const source = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');

  assert.match(source, /PARTNER_MUTATIONS_ENABLED.*=== 'true'/);
  assert.match(source, /!SAFE_METHODS\.has\(request\.method\)/);
  assert.match(source, /startsWith\('\/api\/v1\/partner\/'\)/);
  assert.match(source, /'\/api\/v1\/partners\/applications'/);
  assert.match(source, /PARTNER_OPERATIONS_PAUSED/);
});

test('production startup never mutates historical migration state', async () => {
  const [promotionMigration, kycMigration, startup] = await Promise.all([
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260826100000_add_promotion_redemptions/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../prisma/postgresql/migrations/20260826110000_add_partner_kyc_governance/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(new URL('../scripts/start-production.mjs', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(promotionMigration, /\b(?:ALTER|CREATE)\s+(?:TABLE|INDEX)\b/i);
  assert.doesNotMatch(kycMigration, /\b(?:ALTER|CREATE)\s+(?:TABLE|INDEX)\b/i);
  assert.doesNotMatch(startup, /migrate['",\s]+resolve/);
  assert.doesNotMatch(startup, /RENDER_REPAIR_REDUNDANT_BASELINE/);
});
