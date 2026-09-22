import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const mutationExport = /export async function (?:POST|PATCH|PUT|DELETE)\b/;

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory()
        ? routeFiles(target)
        : Promise.resolve(entry.name === 'route.ts' ? [target] : []);
    }),
  );
  return nested.flat();
}

test('every partner mutation route has route-level same-origin protection', async () => {
  const files = await routeFiles(path.join('app', 'api', 'v1', 'partner'));
  const missing: string[] = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (mutationExport.test(source) && !/isSameOriginMutation\(request\)/.test(source)) {
      missing.push(file.replaceAll('\\', '/'));
    }
  }

  assert.deepEqual(missing, []);
});
