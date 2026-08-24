import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { PromotionRule } from '../constants/promotionRules.ts';
import {
  CUSTOMER_OFFER_RESULT_LIMIT,
  customerOfferProductLinks,
  customerOfferTitle,
  isPublicPromotionRule,
  normalizeCustomerOfferCopy,
} from '../services/customerOfferCatalogueRules.ts';

const serviceSource = await readFile(
  new URL('../services/customerOfferCatalogueService.ts', import.meta.url),
  'utf8',
);
const pageSource = await readFile(new URL('../app/offers/page.tsx', import.meta.url), 'utf8');

function rule(overrides: Partial<PromotionRule> = {}): PromotionRule {
  return {
    active: true,
    code: 'SAFE10',
    maxDiscount: 500,
    minimumSubtotal: 2000,
    percentOff: 10,
    products: ['HOTEL'],
    version: 1,
    ...overrides,
  };
}

test('public product links come only from the closed travel catalogue', () => {
  assert.deepEqual(
    customerOfferProductLinks(['CAR', 'HOTEL', 'CAR']).map((product) => product.href),
    ['/hotels', '/cars'],
  );
  assert.equal(customerOfferTitle(['BUS', 'CAR']), 'Bus and Car offer');
  assert.equal(customerOfferTitle([]), 'Travel offer');
});

test('promotion values fail closed before public presentation', () => {
  assert.equal(isPublicPromotionRule(rule()), true);
  assert.equal(isPublicPromotionRule(rule({ active: false })), false);
  assert.equal(isPublicPromotionRule(rule({ percentOff: 101 })), false);
  assert.equal(isPublicPromotionRule(rule({ maxDiscount: 0 })), false);
  assert.equal(isPublicPromotionRule(rule({ minimumSubtotal: -1 })), false);
  assert.equal(isPublicPromotionRule(rule({ products: [] })), false);
});

test('campaign copy is normalized and strictly bounded', () => {
  assert.equal(
    normalizeCustomerOfferCopy('  Public\n campaign   copy  ', 50),
    'Public campaign copy',
  );
  assert.equal(normalizeCustomerOfferCopy('x'.repeat(800), 120).length, 120);
});

test('stored campaigns authoritatively override baseline codes within bounded queries', () => {
  assert.equal(CUSTOMER_OFFER_RESULT_LIMIT, 100);
  assert.match(serviceSource, /where: \{ code: \{ in: baselineCodes \} \}/);
  assert.match(serviceSource, /where: \{ code: \{ notIn: baselineCodes \} \}/);
  assert.match(serviceSource, /take: CUSTOMER_OFFER_RESULT_LIMIT \+ 1/);
  assert.match(serviceSource, /if \(override\)/);
  assert.match(serviceSource, /resolveStoredPromotionRule/);
  assert.match(serviceSource, /findPromotionRule/);
});

test('public projection excludes campaign operations and stale hard-coded claims', () => {
  assert.doesNotMatch(
    serviceSource,
    /createdByUserId|updatedByUserId|campaignId|actorUserId|reason/,
  );
  assert.doesNotMatch(pageSource, /STAYMORE|FLYSMART|ROADTRIP|12%|10%|8%/);
  assert.match(pageSource, /final pricing are always rechecked during booking/);
  assert.doesNotMatch(pageSource, /fetch\(|method=|<form/);
});
