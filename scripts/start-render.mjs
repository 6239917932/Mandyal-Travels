import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = { ...process.env };
const redundantPromotionMigration = '20260826100000_add_promotion_redemptions';

if (!environment.PUBLIC_APP_ORIGIN) {
  const publicHostname =
    environment.RENDER_EXTERNAL_HOSTNAME?.trim() || environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (!publicHostname) {
    console.error(
      'PUBLIC_APP_ORIGIN, RENDER_EXTERNAL_HOSTNAME, or RAILWAY_PUBLIC_DOMAIN is required.',
    );
    process.exit(1);
  }
  environment.PUBLIC_APP_ORIGIN = `https://${publicHostname}`;
}

if (!environment.DIRECT_DATABASE_URL && environment.DATABASE_URL) {
  environment.DIRECT_DATABASE_URL = environment.DATABASE_URL;
}

if (environment.RENDER_REPAIR_REDUNDANT_BASELINE === 'true') {
  const repair = spawnSync(
    npmCommand,
    [
      'exec',
      '--',
      'prisma',
      'migrate',
      'resolve',
      '--rolled-back',
      redundantPromotionMigration,
      '--config',
      'prisma.postgresql.config.ts',
    ],
    {
      encoding: 'utf8',
      env: environment,
    },
  );
  const repairOutput = `${repair.stdout ?? ''}\n${repair.stderr ?? ''}`;
  if (repair.status === 0) {
    console.log(`Resolved failed redundant migration ${redundantPromotionMigration}.`);
  } else if (!repairOutput.includes('P3012')) {
    process.stdout.write(repair.stdout ?? '');
    process.stderr.write(repair.stderr ?? '');
    process.exit(repair.status ?? 1);
  }
}

const migration = spawnSync(npmCommand, ['run', 'db:deploy:postgresql'], {
  env: environment,
  stdio: 'inherit',
});

if (migration.error) {
  console.error('Unable to start the PostgreSQL migration process.', migration.error);
  process.exit(1);
}
if (migration.status !== 0) process.exit(migration.status ?? 1);

const schemaVerification = spawnSync(
  process.execPath,
  ['scripts/verify-live-postgresql-schema.mjs'],
  {
    env: environment,
    stdio: 'inherit',
  },
);
if (schemaVerification.error) {
  console.error('Unable to start PostgreSQL schema verification.', schemaVerification.error);
  process.exit(1);
}
if (schemaVerification.status !== 0) process.exit(schemaVerification.status ?? 1);

const administratorProvisioning = spawnSync(
  process.execPath,
  ['scripts/enforce-sole-platform-admin.mjs'],
  {
    env: environment,
    stdio: 'inherit',
  },
);
if (administratorProvisioning.error) {
  console.error(
    'Unable to verify the sole platform administrator.',
    administratorProvisioning.error,
  );
  process.exit(1);
}
if (administratorProvisioning.status !== 0) {
  process.exit(administratorProvisioning.status ?? 1);
}

const standalone = existsSync('server.js');
const portal = spawn(
  standalone ? process.execPath : npmCommand,
  standalone ? ['server.js'] : ['start'],
  {
    env: environment,
    stdio: 'inherit',
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => portal.kill(signal));
}

portal.on('error', (error) => {
  console.error('Unable to start the portal process.', error);
  process.exit(1);
});
portal.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
