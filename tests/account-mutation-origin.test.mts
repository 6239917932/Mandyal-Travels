import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const guardedRoutes = [
  'app/api/v1/account/notifications/route.ts',
  'app/api/v1/account/privacy/route.ts',
  'app/api/v1/account/profile/route.ts',
  'app/api/v1/account/sessions/route.ts',
] as const;

test('sensitive account mutations reject cross-origin requests before changing state', async () => {
  for (const routePath of guardedRoutes) {
    const source = await readFile(routePath, 'utf8');
    assert.match(source, /isSameOriginMutation\(request\)/, routePath);
    assert.match(source, /status: 403/, routePath);

    const guard = source.indexOf('isSameOriginMutation(request)');
    const firstMutation = Math.min(
      ...['.create(', '.deleteMany(', '.update(', '.$transaction(']
        .map((operation) => source.indexOf(operation))
        .filter((index) => index >= 0),
    );
    assert.ok(guard >= 0 && guard < firstMutation, `${routePath}: origin guard must run first`);
  }
});
