import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const prismaCliPath = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');

for (const schema of ['prisma/schema.prisma', 'prisma/postgresql/schema.prisma']) {
  const result = spawnSync(process.execPath, [prismaCliPath, 'generate', '--schema', schema], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
      DIRECT_DATABASE_URL:
        process.env.DIRECT_DATABASE_URL ??
        'postgresql://generate:generate@127.0.0.1:5432/mandyal_generate?schema=public',
      JITI_CACHE: 'false',
      JITI_FS_CACHE: 'false',
    },
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Generated synchronized SQLite and PostgreSQL Prisma clients.');
