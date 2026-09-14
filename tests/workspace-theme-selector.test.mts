import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('protected workspaces expose persistent light, dark, and device themes', async () => {
  const shell = await readFile(
    new URL('../components/layout/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  );
  assert.match(shell, /mandyal-workspace-theme/);
  assert.match(shell, /window\.localStorage\.getItem/);
  assert.match(shell, /window\.localStorage\.setItem/);
  assert.match(shell, /prefers-color-scheme: dark/);
  assert.match(shell, /media\.addEventListener\('change'/);
  assert.match(shell, /data-workspace-theme=\{resolvedTheme\}/);
  assert.match(shell, /value="system">Device/);
  assert.match(shell, /value="light">Light/);
  assert.match(shell, /value="dark">Dark/);
  assert.match(shell, /aria-label="Workspace colour theme"/);
});

test('dark styling remains scoped to protected workspace shells', async () => {
  const [components, rootLayout] = await Promise.all([
    readFile(new URL('../styles/components.css', import.meta.url), 'utf8'),
    readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(components, /\.workspace-shell\[data-workspace-theme='dark'\]/);
  assert.match(components, /color-scheme: dark/);
  assert.match(components, /\.workspace-theme-control/);
  assert.doesNotMatch(rootLayout, /data-workspace-theme/);
  assert.match(rootLayout, /colorScheme: 'light'/);
});
