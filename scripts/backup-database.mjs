import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import 'dotenv/config';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
if (!databaseUrl.startsWith('file:')) throw new Error('The bundled backup command supports SQLite file databases only.');

const databasePath = path.resolve(projectRoot, databaseUrl.slice('file:'.length));
const backupDirectory = path.resolve(projectRoot, process.env.DATABASE_BACKUP_DIRECTORY ?? 'backups');
const retentionCount = Math.max(1, Math.min(90, Number.parseInt(process.env.DATABASE_BACKUP_RETENTION ?? '14', 10) || 14));
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const backupPath = path.join(backupDirectory, `mandyal-${timestamp}.db`);

await mkdir(backupDirectory, { recursive: true });
const database = new Database(databasePath, { readonly: true, fileMustExist: true });
try {
  await database.backup(backupPath);
} finally {
  database.close();
}

const backupBytes = await readFile(backupPath);
const checksum = createHash('sha256').update(backupBytes).digest('hex');
await writeFile(`${backupPath}.sha256`, `${checksum}  ${path.basename(backupPath)}\n`, 'utf8');

const backups = (await readdir(backupDirectory)).filter((name) => /^mandyal-.*\.db$/.test(name)).sort().reverse();
for (const expired of backups.slice(retentionCount)) {
  await rm(path.join(backupDirectory, expired));
  await rm(path.join(backupDirectory, `${expired}.sha256`), { force: true });
}

console.log(`Database backup completed: ${backupPath}`);
console.log(`SHA-256: ${checksum}`);
