import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import 'dotenv/config';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDirectory = path.resolve(
  projectRoot,
  process.env.DATABASE_BACKUP_DIRECTORY ?? 'backups',
);

async function resolveBackupPath() {
  if (process.env.BACKUP_VERIFY_PATH)
    return path.resolve(projectRoot, process.env.BACKUP_VERIFY_PATH);

  const candidates = (await readdir(backupDirectory))
    .filter((name) => /^mandyal-.*\.db$/.test(name))
    .sort()
    .reverse();
  if (!candidates[0]) throw new Error(`No database backup exists in ${backupDirectory}.`);
  return path.join(backupDirectory, candidates[0]);
}

const sourcePath = await resolveBackupPath();
const checksumPath = `${sourcePath}.sha256`;
const sourceBytes = await readFile(sourcePath);
const expectedChecksum = (await readFile(checksumPath, 'utf8')).trim().split(/\s+/)[0];
const actualChecksum = createHash('sha256').update(sourceBytes).digest('hex');
if (!expectedChecksum || expectedChecksum !== actualChecksum)
  throw new Error('Backup checksum verification failed. Restore was not attempted.');

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'mandyal-restore-'));
const restoredPath = path.join(temporaryDirectory, 'restored.db');

try {
  await copyFile(sourcePath, restoredPath);
  const database = new Database(restoredPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = database.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') throw new Error(`SQLite integrity check returned: ${integrity}`);

    const foreignKeyFailures = database.pragma('foreign_key_check');
    if (foreignKeyFailures.length) throw new Error('SQLite foreign-key verification failed.');

    const tableRows = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all();
    const tableNames = new Set(tableRows.map((row) => row.name));
    for (const requiredTable of ['User', 'Booking', '_prisma_migrations']) {
      if (!tableNames.has(requiredTable))
        throw new Error(`Restored backup is missing required table ${requiredTable}.`);
    }

    console.log(
      JSON.stringify(
        {
          backup: sourcePath,
          checksum: actualChecksum,
          foreignKeyFailures: 0,
          integrity: 'ok',
          restoredTableCount: tableNames.size,
          verifiedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log('Backup restore verification passed in an isolated temporary directory.');
  } finally {
    database.close();
  }
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
