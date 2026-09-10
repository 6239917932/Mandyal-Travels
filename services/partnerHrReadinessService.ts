import 'server-only';

import { prisma } from '@/lib/prisma';

const MAX_STAFF = 500;

export class PartnerHrReadinessError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function getPartnerHrReadiness(input: { memberRole?: string; partnerId: string }) {
  if (input.memberRole !== 'ADMIN') {
    throw new PartnerHrReadinessError(
      'HR_ACCESS_REQUIRED',
      'A hotel partner administrator is required to view the staff readiness workspace.',
    );
  }
  const members = await prisma.supplyPartnerMember.findMany({
    include: {
      user: {
        select: {
          accessStatus: true,
          email: true,
          emailVerifiedAt: true,
          firstName: true,
          lastName: true,
          mfaCredential: { select: { enabledAt: true } },
          partnerAuditEntries: {
            orderBy: { createdAt: 'desc' },
            select: { action: true, createdAt: true, summary: true },
            take: 1,
            where: { partnerId: input.partnerId },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: MAX_STAFF + 1,
    where: { partnerId: input.partnerId },
  });
  const bounded = members.slice(0, MAX_STAFF);
  const staff = bounded.map((member) => ({
    accessGrantedAt: member.createdAt.toISOString(),
    accessStatus: member.user.accessStatus,
    email: member.user.email,
    emailVerified: Boolean(member.user.emailVerifiedAt),
    id: member.id,
    lastActivity: member.user.partnerAuditEntries[0]
      ? {
          action: member.user.partnerAuditEntries[0].action,
          createdAt: member.user.partnerAuditEntries[0].createdAt.toISOString(),
          summary: member.user.partnerAuditEntries[0].summary,
        }
      : undefined,
    mfaEnabled: Boolean(member.user.mfaCredential?.enabledAt),
    name: `${member.user.firstName} ${member.user.lastName}`.trim().slice(0, 160) || 'Named user',
    role: member.role,
  }));
  const activeStaff = staff.filter((member) => member.accessStatus === 'ACTIVE');
  const securityReady = activeStaff.filter(
    (member) => member.emailVerified && member.mfaEnabled,
  ).length;

  return {
    counts: {
      active: activeStaff.length,
      administrators: staff.filter((member) => member.role === 'ADMIN').length,
      mfaEnabled: staff.filter((member) => member.mfaEnabled).length,
      operators: staff.filter((member) => member.role !== 'ADMIN').length,
      securityReady,
      total: staff.length,
      verifiedEmail: staff.filter((member) => member.emailVerified).length,
    },
    payrollExecutionEnabled: false,
    safetyLimitReached: members.length > MAX_STAFF,
    staff,
  } as const;
}
