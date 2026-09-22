import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return routeFiles(path);
      return entry.name === 'route.ts' ? [path] : [];
    }),
  );
  return files.flat();
}

test('customer account APIs never serialize caught errors to production logs', async () => {
  const routes = [...(await routeFiles('app/api/v1/account')), 'app/api/v1/auth/logout/route.ts'];

  for (const routePath of routes) {
    const source = await readFile(routePath, 'utf8');
    assert.doesNotMatch(
      source,
      /console\.(?:error|warn)\([^\n]*(?:error|err)\s*\)/,
      `${routePath}: caught errors must be reported through the redacted operational logger`,
    );
  }
});
