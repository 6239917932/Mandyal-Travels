import assert from 'node:assert/strict';
import test from 'node:test';

import { POLICY_DOCUMENTS, POLICY_KINDS, PRIVACY_CONSENT_VERSION } from '../lib/legal/policies.ts';

test('the legal center exposes every governed policy kind', () => {
  assert.deepEqual(
    POLICY_DOCUMENTS.map((document) => document.kind),
    [...POLICY_KINDS],
  );
});

test('policy versions are unique and remain explicitly unapproved drafts', () => {
  const versions = POLICY_DOCUMENTS.map((document) => document.version);
  assert.equal(new Set(versions).size, versions.length);

  for (const document of POLICY_DOCUMENTS) {
    assert.equal(document.status, 'DRAFT');
    assert.ok(document.title.trim());
    assert.ok(document.summary.trim());
    assert.match(document.lastUpdated, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(document.sections.length > 0);

    for (const section of document.sections) {
      assert.ok(section.heading.trim());
      assert.ok(section.paragraphs.length > 0);
      assert.ok(section.paragraphs.every((paragraph) => paragraph.trim()));
    }
  }
});

test('marketing consent references the current privacy-policy version', () => {
  const privacyPolicy = POLICY_DOCUMENTS.find((document) => document.kind === 'privacy');
  assert.ok(privacyPolicy);
  assert.equal(privacyPolicy.version, PRIVACY_CONSENT_VERSION);
});

test('marketplace terms distinguish supplier and platform responsibility without waiving rights', () => {
  const terms = POLICY_DOCUMENTS.find((document) => document.kind === 'terms');
  const marketplace = POLICY_DOCUMENTS.find(
    (document) => document.kind === 'marketplace-suppliers',
  );

  assert.ok(terms);
  assert.ok(marketplace);

  const termsText = terms.sections.flatMap((section) => section.paragraphs).join(' ');
  const marketplaceText = marketplace.sections.flatMap((section) => section.paragraphs).join(' ');

  assert.match(termsText, /Supplier-direct referral/);
  assert.match(termsText, /Platform-facilitated booking/);
  assert.match(termsText, /Nothing in these terms excludes or limits liability/);
  assert.match(marketplaceText, /Blanket “platform is never responsible” statements/);
});

test('commercial partner activation remains contract and approval gated', () => {
  const standards = POLICY_DOCUMENTS.find((document) => document.kind === 'partner-standards');
  assert.ok(standards);

  const text = standards.sections.flatMap((section) => section.paragraphs).join(' ');
  assert.match(text, /must not become publicly bookable merely by creating an account/);
  assert.match(text, /versioned partner agreement/);
  assert.match(text, /qualified Indian counsel/);
});

test('refund and safety policies preserve platform duties and escalation', () => {
  const refunds = POLICY_DOCUMENTS.find((document) => document.kind === 'cancellation-refunds');
  const safety = POLICY_DOCUMENTS.find((document) => document.kind === 'safety-grievances');
  assert.ok(refunds);
  assert.ok(safety);

  const refundText = refunds.sections.flatMap((section) => section.paragraphs).join(' ');
  const safetyText = safety.sections.flatMap((section) => section.paragraphs).join(' ');

  assert.match(refundText, /Supplier approval is not required where law/);
  assert.match(refundText, /original supported payment method/);
  assert.match(safetyText, /contact the local emergency service or police first/);
  assert.match(safetyText, /forty-eight hours/);
  assert.match(safetyText, /Motor Vehicle Aggregator Guidelines, 2025/);
});
