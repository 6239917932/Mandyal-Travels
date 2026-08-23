import assert from 'node:assert/strict';
import test from 'node:test';

import {
  destinationContentMissingFields,
  destinationContentStatus,
  normalizeDestinationContentInput,
  parseDestinationContentList,
} from '../services/destinationContentService.ts';

const valid = {
  action: 'PUBLISH',
  bestTimeToVisit: 'March to June and September to November',
  country: 'India',
  expectedVersion: 1,
  heroImageUrl: '/brand/mandi-himalayan-hero-v1.png',
  highlights: 'Mountain walks\nLocal markets',
  introduction:
    'Explore a carefully reviewed destination guide with practical context for planning a thoughtful journey through the region.',
  name: 'Mandi',
  reason: 'Publish the reviewed destination guide.',
  slug: 'mandi-himachal-pradesh',
  state: 'Himachal Pradesh',
  summary:
    'A historic Himalayan meeting place shaped by rivers, temples, markets, and mountain roads.',
  travelTips: 'Carry layers for changing weather\nConfirm live transport before departure',
};

test('destination content normalizes bounded publish-ready values', () => {
  assert.deepEqual(normalizeDestinationContentInput(valid), {
    ...valid,
    highlights: ['Mountain walks', 'Local markets'],
    travelTips: ['Carry layers for changing weather', 'Confirm live transport before departure'],
  });
});

test('destination publishing fails closed when required content is incomplete', () => {
  assert.equal(
    normalizeDestinationContentInput({ ...valid, heroImageUrl: 'http://unsafe.example/image.jpg' }),
    null,
  );
  assert.equal(normalizeDestinationContentInput({ ...valid, highlights: 'Only one' }), null);
  assert.deepEqual(
    destinationContentMissingFields({
      ...valid,
      highlights: [],
      travelTips: [],
    }),
    ['at least two highlights', 'at least two travel tips'],
  );
});

test('draft saves preserve published content and unpublishing returns to draft', () => {
  assert.equal(destinationContentStatus(undefined, 'SAVE_DRAFT'), 'DRAFT');
  assert.equal(destinationContentStatus('PUBLISHED', 'SAVE_DRAFT'), 'PUBLISHED');
  assert.equal(destinationContentStatus('PUBLISHED', 'UNPUBLISH'), 'DRAFT');
});

test('stored destination lists parse safely without trusting malformed JSON', () => {
  assert.deepEqual(parseDestinationContentList('["Temple walk","Local food"]'), [
    'Temple walk',
    'Local food',
  ]);
  assert.deepEqual(parseDestinationContentList('{broken'), []);
});
