export const BUSINESS_AUDIT_ACTIONS = {
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  POLICY_UPDATED: 'POLICY_UPDATED',
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_REVIEWED: 'REQUEST_REVIEWED',
  TRAVEL_BOOKED: 'TRAVEL_BOOKED',
} as const;

type BusinessAuditData = {
  action: (typeof BUSINESS_AUDIT_ACTIONS)[keyof typeof BUSINESS_AUDIT_ACTIONS];
  actorUserId?: string | null;
  entityId?: string | null;
  entityType: 'MEMBERSHIP' | 'ORGANIZATION' | 'TRAVEL_REQUEST';
  metadata?: Record<string, boolean | number | string | null>;
  organizationId: string;
  summary: string;
};

export function createBusinessAuditData({
  action,
  actorUserId = null,
  entityId = null,
  entityType,
  metadata = {},
  organizationId,
  summary,
}: BusinessAuditData) {
  return {
    action,
    actorUserId,
    entityId,
    entityType,
    metadataJson: JSON.stringify(metadata),
    organizationId,
    summary,
  };
}
