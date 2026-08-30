import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = { ...process.env };

if (!environment.PUBLIC_APP_ORIGIN) {
  const renderHostname = environment.RENDER_EXTERNAL_HOSTNAME?.trim();
  if (!renderHostname) {
    console.error('PUBLIC_APP_ORIGIN or RENDER_EXTERNAL_HOSTNAME is required.');
    process.exit(1);
  }
  environment.PUBLIC_APP_ORIGIN = `https://${renderHostname}`;
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
