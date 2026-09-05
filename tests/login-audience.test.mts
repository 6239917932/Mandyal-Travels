import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  canUseLoginAudience,
  getLoginAudienceDestination,
  inferLoginAudience,
  isReturnToAllowedForAudience,
  normalizeLoginAudience,
} from '../lib/auth/loginAudience.ts';

const customer = {
  hasPartnerApplication: false,
  hasPartnerMembership: false,
  organizationType: null,
  role: 'CUSTOMER',
};

test('login audience catalogue and route inference remain closed', () => {
  assert.equal(normalizeLoginAudience('customer'), 'customer');
  assert.equal(normalizeLoginAudience('admin'), 'admin');
  assert.equal(normalizeLoginAudience('staff'), null);
  assert.equal(inferLoginAudience('/admin/users'), 'admin');
  assert.equal(inferLoginAudience('/partner/properties'), 'partner');
  assert.equal(inferLoginAudience('/business/dashboard'), 'corporate');
  assert.equal(inferLoginAudience('/account/company-requests'), 'corporate');
  assert.equal(inferLoginAudience('/account/trips'), 'customer');
  assert.equal(inferLoginAudience('/contact'), null);
});

test('customer, corporate, partner, and administrator access are separated', () => {
  assert.equal(canUseLoginAudience('customer', customer), true);
  assert.equal(canUseLoginAudience('admin', customer), false);
  assert.equal(canUseLoginAudience('admin', { ...customer, role: 'PLATFORM_ADMIN' }), true);
  assert.equal(
    canUseLoginAudience('corporate', { ...customer, organizationType: 'CORPORATE' }),
    true,
  );
  assert.equal(
    canUseLoginAudience('customer', { ...customer, organizationType: 'CORPORATE' }),
    false,
  );
  assert.equal(canUseLoginAudience('partner', { ...customer, hasPartnerApplication: true }), true);
  assert.equal(
    canUseLoginAudience('customer', { ...customer, hasPartnerApplication: true }),
    false,
  );
});

test('each audience receives only its own protected destination', () => {
  assert.equal(getLoginAudienceDestination('customer', customer), '/account');
  assert.equal(getLoginAudienceDestination('partner', customer), '/partners/apply');
  assert.equal(
    getLoginAudienceDestination('corporate', {
      ...customer,
      organizationType: 'CORPORATE',
    }),
    '/account/company-requests',
  );
  assert.equal(
    getLoginAudienceDestination('corporate', {
      ...customer,
      organizationType: 'CORPORATE',
      role: 'BUSINESS_ADMIN',
    }),
    '/business/dashboard',
  );
  assert.equal(
    getLoginAudienceDestination('partner', { ...customer, hasPartnerMembership: true }),
    '/partner',
  );
  assert.equal(isReturnToAllowedForAudience('admin', '/admin/configuration'), true);
  assert.equal(isReturnToAllowedForAudience('customer', '/admin/configuration'), false);
});

test('public sign-in presents four distinct portals with no administrator registration', async () => {
  const [page, form, route, footer, business] = await Promise.all([
    readFile(new URL('../app/login/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/auth/AuthForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/v1/auth/login/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/layout/SiteFooter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/business/page.tsx', import.meta.url), 'utf8'),
  ]);

  for (const label of [
    'Customer login',
    'Partner login',
    'Corporate login',
    'Administrator login',
  ]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(form, /loginAudience === 'admin'/);
  assert.match(form, /Administrator access is restricted/);
  assert.doesNotMatch(form, /register\?account=admin/);
  assert.match(page, /Choose a different login/);
  assert.match(route, /canUseLoginAudience\(loginAudience, audienceContext\)/);
  assert.match(route, /isReturnToAllowedForAudience\(loginAudience, returnTo\)/);
  assert.match(footer, /login\?portal=partner/);
  assert.match(footer, /login\?portal=corporate/);
  assert.match(business, /login\?portal=corporate/);
});

test('unapproved supplier accounts are routed into applications, not partner operations', async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL('../app/partner/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/partner/page.tsx', import.meta.url), 'utf8'),
  ]);

  for (const source of [layout, page]) {
    assert.match(
      source,
      /if \(!access\?\.partnerId \|\| !access\.userId\) redirect\('\/partners\/apply'\)/,
    );
  }
});
