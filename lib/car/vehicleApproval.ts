export function evaluateVehicleReview(input: {
  action: string;
  approvalStatus: string;
  complianceState: string;
  hasRegistrationNumber: boolean;
  openHighRiskSignals: number;
  reviewNote: string;
}) {
  const action = input.action.trim().toUpperCase();
  const reviewNote = input.reviewNote.trim().replace(/\s+/g, ' ').slice(0, 500);
  if (!['APPROVE', 'REJECT', 'PAUSE', 'ARCHIVE'].includes(action)) {
    return {
      valid: false as const,
      code: 'INVALID_REVIEW_ACTION',
      message: 'Choose a valid vehicle review action.',
    };
  }
  if (
    (action === 'REJECT' || action === 'PAUSE' || action === 'ARCHIVE') &&
    reviewNote.length < 10
  ) {
    return {
      valid: false as const,
      code: 'REVIEW_NOTE_REQUIRED',
      message: 'Enter a review reason of at least 10 characters.',
    };
  }
  if (action === 'APPROVE') {
    if (input.approvalStatus !== 'PENDING_REVIEW') {
      return {
        valid: false as const,
        code: 'VEHICLE_NOT_PENDING',
        message: 'Only a pending vehicle can be approved.',
      };
    }
    if (!input.hasRegistrationNumber || input.complianceState !== 'CURRENT') {
      return {
        valid: false as const,
        code: 'VEHICLE_COMPLIANCE_REQUIRED',
        message: 'Registration and all current compliance dates are required before approval.',
      };
    }
    if (input.openHighRiskSignals > 0) {
      return {
        valid: false as const,
        code: 'HIGH_RISK_REVIEW_REQUIRED',
        message: 'Resolve all open high-risk signals before approval.',
      };
    }
  }
  const state =
    action === 'APPROVE'
      ? { approvalStatus: 'APPROVED', publicationStatus: 'PUBLISHED', status: 'ACTIVE' }
      : action === 'REJECT'
        ? { approvalStatus: 'CHANGES_REQUIRED', publicationStatus: 'DRAFT', status: 'PAUSED' }
        : action === 'ARCHIVE'
          ? {
              approvalStatus: input.approvalStatus,
              publicationStatus: 'ARCHIVED',
              status: 'ARCHIVED',
            }
          : { approvalStatus: input.approvalStatus, publicationStatus: 'PAUSED', status: 'PAUSED' };
  return { valid: true as const, action, reviewNote, ...state };
}
