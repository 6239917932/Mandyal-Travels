import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('protected workspaces expose one unambiguous mobile navigation control', async () => {
  const [header, shell, layout, components] = await Promise.all([
    read('components/layout/SiteHeader.tsx'),
    read('components/layout/WorkspaceShell.tsx'),
    read('styles/layout.css'),
    read('styles/components.css'),
  ]);
  assert.match(header, /isWorkspacePath/);
  assert.match(header, /site-header--workspace/);
  assert.match(header, /!isWorkspacePath \? \([\s\S]*site-header__menu-button/);
  assert.doesNotMatch(header, /isMenuOpen && !isWorkspacePath/);
  assert.match(layout, /site-header--workspace \.site-header__menu-button[\s\S]*display: none/);
  assert.match(shell, /aria-label="Close workspace menu"/);
  assert.match(shell, /event\.key !== 'Escape'/);
  assert.match(
    shell,
    /closeOnEscape[\s\S]*navigationToggleRef\.current\.checked = false;[\s\S]*setNavigationOpen\(false\)/,
  );
  assert.match(shell, /window\.addEventListener\('popstate', closeOnHistoryNavigation\)/);
  assert.match(shell, /workspace-navigation-open/);
  assert.match(shell, /id="workspace-navigation-toggle"/);
  assert.match(shell, /htmlFor="workspace-navigation-toggle"/);
  assert.match(components, /workspace-shell__nav-toggle:checked ~ \.workspace-sidebar/);
  assert.match(components, /workspace-shell__nav-toggle:checked \+ \.workspace-shell__backdrop/);
});

test('phone layouts constrain controls, tables, drawers and dense content', async () => {
  const [components, rootLayout] = await Promise.all([
    read('styles/components.css'),
    read('app/layout.tsx'),
  ]);
  assert.match(rootLayout, /width: 'device-width'/);
  assert.match(rootLayout, /initialScale: 1/);
  assert.match(components, /max-height: 100dvh/);
  assert.match(components, /width: min\(18rem, calc\(100vw - 2\.5rem\)\)/);
  assert.match(components, /\.workspace-shell__content table[\s\S]*overflow-x: auto/);
  assert.match(components, /font-size: 1rem/);
  assert.match(components, /body\.workspace-navigation-open[\s\S]*overflow: hidden/);
  assert.match(components, /minmax\(min\(100%, 19rem\), 1fr\)/);
});
