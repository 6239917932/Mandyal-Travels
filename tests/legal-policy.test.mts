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
