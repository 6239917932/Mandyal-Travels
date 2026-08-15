import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatLocalizedMoney,
  isSupportedCurrency,
  isSupportedLocale,
} from '../lib/localization/catalog.ts';

test('localization catalogue is closed and money uses minor units', () => {
  assert.equal(isSupportedLocale('hi-IN'), true);
  assert.equal(isSupportedLocale('unknown'), false);
  assert.equal(isSupportedCurrency('inr'), true);
  assert.match(formatLocalizedMoney(350000, 'INR', 'en-IN'), /3,500/);
  assert.throws(() => formatLocalizedMoney(3.5, 'INR', 'en-IN'));
});
