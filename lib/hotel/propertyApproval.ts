export type PropertyReviewAction = 'APPROVE' | 'REJECT';

export type PropertyReviewDecision =
  | {
      approvalStatus: 'APPROVED' | 'REJECTED';
      publicationStatus: 'PUBLISHED' | 'DRAFT';
      reviewNote: string;
      valid: true;
    }
  | {
      code: 'INVALID_REVIEW_ACTION' | 'PROPERTY_NOT_PENDING' | 'REVIEW_NOTE_REQUIRED' | 'ROOM_REQUIRED';
      message: string;
      valid: false;
    };

export function evaluatePropertyReview(input: {
  action: string;
  activeRoomCount: number;
  approvalStatus: string;
  reviewNote: string;
}): PropertyReviewDecision {
  if (input.action !== 'APPROVE' && input.action !== 'REJECT') {
    return { code: 'INVALID_REVIEW_ACTION', message: 'Choose approve or reject.', valid: false };
  }
  const reviewNote = input.reviewNote.trim().slice(0, 500);
  if (input.action === 'REJECT' && reviewNote.length < 10) {
    return {
      code: 'REVIEW_NOTE_REQUIRED',
      message: 'Explain the required corrections before rejecting.',
      valid: false,
    };
  }
  if (input.approvalStatus !== 'PENDING_REVIEW') {
    return {
      code: 'PROPERTY_NOT_PENDING',
      message: 'Only a pending property can be reviewed.',
      valid: false,
    };
  }
  if (input.action === 'APPROVE' && input.activeRoomCount < 1) {
    return {
      code: 'ROOM_REQUIRED',
      message: 'A property needs an active room before approval.',
      valid: false,
    };
  }
  return {
    approvalStatus: input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    publicationStatus: input.action === 'APPROVE' ? 'PUBLISHED' : 'DRAFT',
    reviewNote,
    valid: true,
  };
}

export function propertyMaterialEditReviewReset() {
  return {
    approvalNote: '',
    approvalStatus: 'PENDING_REVIEW' as const,
    publicationStatus: 'DRAFT' as const,
    reviewedAt: null,
    reviewedByUserId: null,
    submittedAt: null,
  };
}
