import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePropertyReview,
  propertyMaterialEditReviewReset,
} from '../lib/hotel/propertyApproval.ts';

test('only pending properties can be reviewed', () => {
  const result = evaluatePropertyReview({
    action: 'APPROVE', activeRoomCount: 1, approvalStatus: 'APPROVED', reviewNote: '',
  });
  assert.deepEqual(result.valid ? undefined : result.code, 'PROPERTY_NOT_PENDING');
});

test('approval requires active inventory and publishes the property', () => {
  const missingRoom = evaluatePropertyReview({
    action: 'APPROVE', activeRoomCount: 0, approvalStatus: 'PENDING_REVIEW', reviewNote: '',
  });
  assert.deepEqual(missingRoom.valid ? undefined : missingRoom.code, 'ROOM_REQUIRED');

  const approved = evaluatePropertyReview({
    action: 'APPROVE', activeRoomCount: 1, approvalStatus: 'PENDING_REVIEW', reviewNote: 'Verified',
  });
  assert.equal(approved.valid, true);
  if (approved.valid) {
    assert.equal(approved.approvalStatus, 'APPROVED');
    assert.equal(approved.publicationStatus, 'PUBLISHED');
  }
});

test('rejection requires useful correction notes and returns the listing to draft', () => {
  const tooShort = evaluatePropertyReview({
    action: 'REJECT', activeRoomCount: 1, approvalStatus: 'PENDING_REVIEW', reviewNote: 'Fix it',
  });
  assert.deepEqual(tooShort.valid ? undefined : tooShort.code, 'REVIEW_NOTE_REQUIRED');

  const rejected = evaluatePropertyReview({
    action: 'REJECT', activeRoomCount: 1, approvalStatus: 'PENDING_REVIEW', reviewNote: '  Add a verified street address.  ',
  });
  assert.equal(rejected.valid, true);
  if (rejected.valid) {
    assert.equal(rejected.approvalStatus, 'REJECTED');
    assert.equal(rejected.publicationStatus, 'DRAFT');
    assert.equal(rejected.reviewNote, 'Add a verified street address.');
  }
});

test('material edits clear prior review state', () => {
  assert.deepEqual(propertyMaterialEditReviewReset(), {
    approvalNote: '', approvalStatus: 'PENDING_REVIEW', publicationStatus: 'DRAFT',
    reviewedAt: null, reviewedByUserId: null, submittedAt: null,
  });
});
