import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import Database from 'better-sqlite3';

const projectRoot = process.cwd();
const backupScript = path.join(projectRoot, 'scripts', 'backup-database.mjs');
const verifyScript = path.join(projectRoot, 'scripts', 'verify-backup-restore.mjs');

function runScript(script: string, environment: Record<string, string>) {
  return spawnSync(process.execPath, [script], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
}

test('backup refuses an uninitialized database and verifies a valid core schema', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'mandyal-backup-test-'));
  const databasePath = path.join(temporaryDirectory, 'source.db');
  const backupDirectory = path.join(temporaryDirectory, 'backups');
  const environment = {
    DATABASE_BACKUP_DIRECTORY: backupDirectory,
    DATABASE_URL: `file:${databasePath}`,
  };

  try {
    const emptyDatabase = new Database(databasePath);
    emptyDatabase.close();

    const rejected = runScript(backupScript, environment);
    assert.notEqual(rejected.status, 0);
    assert.match(
      `${rejected.stdout}${rejected.stderr}`,
      /missing required table User; no backup was created/,
    );
    assert.deepEqual(await readdir(backupDirectory), []);

    const initializedDatabase = new Database(databasePath);
    initializedDatabase.exec(`
      CREATE TABLE User (id TEXT PRIMARY KEY);
      CREATE TABLE Booking (id TEXT PRIMARY KEY);
      CREATE TABLE _prisma_migrations (id TEXT PRIMARY KEY);
    `);
    initializedDatabase.close();

    const created = runScript(backupScript, environment);
    assert.equal(created.status, 0, `${created.stdout}${created.stderr}`);

    const backupName = (await readdir(backupDirectory)).find((name) => name.endsWith('.db'));
    assert.ok(backupName);

    const verified = runScript(verifyScript, {
      ...environment,
      BACKUP_VERIFY_PATH: path.join(backupDirectory, backupName),
    });
    assert.equal(verified.status, 0, `${verified.stdout}${verified.stderr}`);
    assert.match(verified.stdout, /Backup restore verification passed/);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});
