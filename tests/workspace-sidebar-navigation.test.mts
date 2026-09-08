import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getWorkspaceActiveNavigationKey } from '../lib/navigation/workspaceActiveRoute.ts';

test('workspace navigation selects only the most specific matching route', () => {
  const groups = [
    {
      items: [{ href: '/partner' }, { href: '/partner/pms' }, { href: '/partner/pms/guest-crm' }],
    },
  ];

  assert.equal(getWorkspaceActiveNavigationKey('/partner', groups), '0:0');
  assert.equal(getWorkspaceActiveNavigationKey('/partner/pms', groups), '0:1');
  assert.equal(getWorkspaceActiveNavigationKey('/partner/pms/guest-crm', groups), '0:2');
  assert.equal(getWorkspaceActiveNavigationKey('/partner/pms/guest-crm/detail', groups), '0:2');
  assert.equal(getWorkspaceActiveNavigationKey('/unknown', groups), undefined);
});

test('workspace navigation marks only the first item when destinations are duplicated', () => {
  const groups = [{ items: [{ href: '/partner/bookings' }, { href: '/partner/bookings' }] }];

  assert.equal(getWorkspaceActiveNavigationKey('/partner/bookings', groups), '0:0');
});

test('all protected account types use the shared persistent workspace sidebar', async () => {
  const [shell, admin, partner, account, business, agent] = await Promise.all([
    readFile(new URL('../components/layout/WorkspaceShell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/account/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/business/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/agent/layout.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(shell, /workspace-sidebar/);
  assert.match(shell, /aria-current/);
  assert.match(shell, /prefetch=\{false\}/);
  assert.match(shell, /method="post"/);
  for (const layout of [admin, partner, account, business, agent]) {
    assert.match(layout, /WorkspaceShell/);
  }
});

test('workspace sign out remains available in the sticky top bar without sidebar scrolling', async () => {
  const shell = await readFile(
    new URL('../components/layout/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  );
  const topbar = shell.slice(shell.indexOf('<header className="workspace-topbar">'));

  assert.match(topbar, /action="\/api\/v1\/auth\/logout"/);
  assert.match(topbar, /workspace-topbar__signout/);
  assert.doesNotMatch(shell, /workspace-sidebar__account/);
});

test('administrator navigation is grouped and covers every control-center destination', async () => {
  const [navigation, page] = await Promise.all([
    readFile(new URL('../lib/navigation/workspaceNavigation.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8'),
  ]);
  for (const category of [
    'Customers and bookings',
    'Suppliers and inventory',
    'Finance',
    'Operations and integrations',
    'Content and communication',
    'Security and system',
  ]) {
    assert.match(navigation, new RegExp(category));
  }
  for (const path of [
    '/admin/users',
    '/admin/organizations',
    '/admin/partners',
    '/admin/reviews',
    '/admin/finance',
    '/admin/tax',
    '/admin/settlements',
    '/admin/analytics',
    '/admin/bookings',
    '/admin/documents',
    '/admin/catalog',
    '/admin/inventory',
    '/admin/content',
    '/admin/notifications',
    '/admin/search',
    '/admin/promotions',
    '/admin/operations',
    '/admin/risk',
    '/admin/integrations',
    '/admin/support',
    '/admin/configuration',
    '/admin/service-advisories',
    '/admin/audit',
    '/admin/security',
    '/admin/privacy',
  ]) {
    assert.match(navigation, new RegExp(path.replaceAll('/', '\\/')));
  }
  assert.doesNotMatch(page, /className="admin-hero__actions"/);
});

test('hotel partner sidebar includes the complete governed PMS registry without a nested duplicate', async () => {
  const [partnerLayout, partnerPage, pmsLayout, pmsPage] = await Promise.all([
    readFile(new URL('../app/partner/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/pms/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(partnerLayout, /pmsModuleGroups/);
  assert.match(partnerLayout, /pmsModules/);
  assert.match(partnerLayout, /getPmsModuleHref\(module\)/);
  assert.match(partnerLayout, /module\.status === 'LIVE'/);
  assert.match(partnerLayout, /Tax and billing/);
  assert.doesNotMatch(partnerPage, /className="admin-hero__actions"/);
  assert.doesNotMatch(pmsLayout, /pms-sidebar/);
  assert.doesNotMatch(pmsPage, /className="admin-hero__actions"/);
});

test('corporate and agent landing pages leave workspace navigation in the sidebar', async () => {
  const [businessPage, agentPage] = await Promise.all([
    readFile(new URL('../app/business/dashboard/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/agent/page.tsx', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(businessPage, /className="manage-booking__document-actions"/);
  assert.doesNotMatch(agentPage, /className="manage-booking__document-actions"/);
});
