import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageSource = await readFile(new URL('../package.json', import.meta.url), 'utf8');
const packageJson = JSON.parse(packageSource) as { scripts?: Record<string, string> };

const configs = [
  ['notification', 'railway.notification-worker.json', '*/5 * * * *', 'worker:notifications'],
  ['maintenance', 'railway.maintenance-worker.json', '17 * * * *', 'worker:maintenance'],
  ['search', 'railway.search-worker.json', '43 2 * * *', 'worker:search-projections'],
] as const;

for (const [name, file, schedule, command] of configs) {
  test(`${name} worker has a bounded one-shot Railway deployment`, async () => {
    const source = await readFile(new URL(`../deploy/${file}`, import.meta.url), 'utf8');
    const config = JSON.parse(source) as {
      build?: { builder?: string; dockerfilePath?: string };
      deploy?: { cronSchedule?: string; restartPolicyType?: string; startCommand?: string };
    };

    assert.equal(config.build?.builder, 'DOCKERFILE');
    assert.equal(config.build?.dockerfilePath, 'Dockerfile');
    assert.equal(config.deploy?.cronSchedule, schedule);
    assert.equal(config.deploy?.restartPolicyType, 'NEVER');
    assert.equal(config.deploy?.startCommand, `npm run ${command}`);
    assert.equal(
      typeof packageJson.scripts?.[command],
      'string',
      `${file} references the missing package script ${command}`,
    );
    assert.match(
      packageJson.scripts?.[command] ?? '',
      /^node scripts\/run-[a-z0-9-]+-worker\.mjs$/,
      `${command} must remain a reviewed one-shot worker entry point`,
    );
  });
}

test('Railway worker configs use unique package scripts', () => {
  const commands = configs.map(([, , , command]) => command);
  assert.equal(new Set(commands).size, commands.length);
});
