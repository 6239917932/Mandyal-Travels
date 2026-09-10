import 'server-only';

import { prisma } from '@/lib/prisma';

const MAX_STAFF = 500;
const MAX_PAYROLL_RECORDS = 200;

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
  const [properties, payrollRecords] = await Promise.all([
    prisma.partnerProperty.findMany({
      orderBy: { displayName: 'asc' },
      select: { displayName: true, id: true },
      take: 100,
      where: { listingSource: 'MANAGED', partnerId: input.partnerId, status: 'ACTIVE' },
    }),
    prisma.hotelPayrollRecord.findMany({
      include: {
        member: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
        property: { select: { displayName: true } },
      },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      take: MAX_PAYROLL_RECORDS + 1,
      where: { partnerId: input.partnerId },
    }),
  ]);

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
    payrollExecutionEnabled: true,
    payrollRecords: payrollRecords.slice(0, MAX_PAYROLL_RECORDS).map((record) => ({
      createdAt: record.createdAt.toISOString(),
      currency: record.currency,
      deductionAmount: record.deductionAmount,
      employeeEmail: record.member.user.email,
      employeeName:
        `${record.member.user.firstName} ${record.member.user.lastName}`.trim() ||
        'Named staff member',
      grossAmount: record.grossAmount,
      id: record.id,
      netAmount: record.netAmount,
      note: record.note,
      period: record.period,
      propertyName: record.property.displayName,
      revision: record.revision,
      status: record.status,
      version: record.version,
    })),
    payrollSafetyLimitReached: payrollRecords.length > MAX_PAYROLL_RECORDS,
    properties: properties.map((property) => ({ id: property.id, name: property.displayName })),
    safetyLimitReached: members.length > MAX_STAFF,
    staff,
  } as const;
}
