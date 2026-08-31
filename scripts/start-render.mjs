import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = { ...process.env };
const redundantPromotionMigration = '20260826100000_add_promotion_redemptions';

if (!environment.PUBLIC_APP_ORIGIN) {
  const renderHostname = environment.RENDER_EXTERNAL_HOSTNAME?.trim();
  if (!renderHostname) {
    console.error('PUBLIC_APP_ORIGIN or RENDER_EXTERNAL_HOSTNAME is required.');
    process.exit(1);
  }
  environment.PUBLIC_APP_ORIGIN = `https://${renderHostname}`;
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

const portal = spawn(npmCommand, ['start'], {
  env: environment,
  stdio: 'inherit',
});

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
