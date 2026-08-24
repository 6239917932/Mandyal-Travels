import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adminReviewPath,
  normalizeAdminReviewFilters,
  normalizeReviewDecision,
  privateReviewerReference,
  reviewCreatedAfter,
  reviewerDisplayName,
} from '../services/adminReviewModerationService.ts';

test('review filters are closed, bounded, and deterministic', () => {
  assert.deepEqual(
    normalizeAdminReviewFilters({
      page: '3',
      q: '  palace   stay ',
      rating: '5',
      status: 'published',
      window: '30',
    }),
    { page: 3, query: 'palace stay', rating: '5', status: 'PUBLISHED', window: '30' },
  );
  assert.deepEqual(
    normalizeAdminReviewFilters({ page: '-4', rating: '9', status: 'deleted', window: '365' }),
    {
      page: 1,
      query: '',
      rating: 'ALL',
      status: 'PENDING',
      window: 'ALL',
    },
  );
});

test('review pagination preserves active filters', () => {
  const filters = normalizeAdminReviewFilters({
    q: 'hill view',
    rating: '4',
    status: 'all',
    window: '90',
  });
  assert.equal(
    adminReviewPath(filters, 2),
    '/admin/reviews?page=2&q=hill+view&status=ALL&rating=4&window=90',
  );
});

test('review date windows use a stable UTC boundary', () => {
  assert.equal(
    reviewCreatedAfter('30', new Date('2026-08-24T12:00:00.000Z'))?.toISOString(),
    '2026-07-25T12:00:00.000Z',
  );
  assert.equal(reviewCreatedAfter('ALL'), undefined);
});

test('reviewer presentation is private and rejection reasons are meaningful', () => {
  assert.equal(reviewerDisplayName(' Jasveer ', ' Singh '), 'Jasveer S.');
  assert.match(privateReviewerReference('user-123'), /^REV-[A-F0-9]{10}$/);
  assert.deepEqual(
    normalizeReviewDecision({ action: 'REJECT', note: '  Contains   abusive content. ' }),
    {
      action: 'REJECT',
      note: 'Contains abusive content.',
    },
  );
  assert.equal(normalizeReviewDecision({ action: 'REJECT', note: 'short' }), null);
  assert.deepEqual(normalizeReviewDecision({ action: 'PUBLISH', note: '' }), {
    action: 'PUBLISH',
    note: '',
  });
});

test('public summaries aggregate every published review and admin UI excludes email', () => {
  const repository = readFileSync('repositories/hotelReviewRepository.ts', 'utf8');
  const page = readFileSync('app/admin/reviews/page.tsx', 'utf8');
  assert.match(repository, /hotelReview\.count/);
  assert.match(repository, /hotelReview\.aggregate/);
  assert.match(repository, /status: 'PUBLISHED'/);
  assert.doesNotMatch(page, /email:\s*true/);
  assert.match(page, /privateReviewerReference/);
});
