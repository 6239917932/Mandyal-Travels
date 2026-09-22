import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const mutationExport = /export async function (?:POST|PATCH|PUT|DELETE)\s*\(/;

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) return routeFiles(candidate);
      return entry.isFile() && entry.name === 'route.ts' ? [candidate] : [];
    }),
  );
  return nested.flat();
}

test('every administrator mutation route enforces same-origin browser requests', async () => {
  const root = path.resolve('app/api/v1/admin');
  const missing: string[] = [];
  for (const routePath of await routeFiles(root)) {
    const source = await readFile(routePath, 'utf8');
    if (mutationExport.test(source) && !/isSameOriginMutation\(request\)/.test(source)) {
      missing.push(path.relative(process.cwd(), routePath));
    }
  }
  assert.deepEqual(missing, []);
});
