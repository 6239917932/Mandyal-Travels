import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';

const migrationRoot = path.join(process.cwd(), 'prisma', 'migrations');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mandyal-migrations-'));
const databasePath = path.join(temporaryDirectory, 'verification.db');
const database = new Database(databasePath);

try {
  const migrationDirectories = fs
    .readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let appliedMigrations = 0;

  for (const migrationDirectory of migrationDirectories) {
    const migrationPath = path.join(migrationRoot, migrationDirectory, 'migration.sql');

    if (!fs.existsSync(migrationPath)) {
      continue;
    }

    database.exec(fs.readFileSync(migrationPath, 'utf8'));
    appliedMigrations += 1;
  }

  if (appliedMigrations === 0) {
    throw new Error('No database migrations were found.');
  }

  const foreignKeyIssues = database.pragma('foreign_key_check');
  const integrityResult = database.pragma('integrity_check', { simple: true });

  if (foreignKeyIssues.length > 0) {
    throw new Error(
      `Migration verification found ${foreignKeyIssues.length} foreign-key issue(s).`,
    );
  }

  if (integrityResult !== 'ok') {
    throw new Error(`Migration verification failed the SQLite integrity check: ${integrityResult}`);
  }

  console.log(`Verified ${appliedMigrations} database migrations on a clean database.`);
} finally {
  database.close();
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}
