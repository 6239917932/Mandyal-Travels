import { prisma } from '@/lib/prisma';
import {
  canTransitionServiceAdvisory,
  isServiceAdvisorySeverity,
  isServiceAdvisoryStatus,
  isServiceAdvisorySurface,
  isServiceAdvisoryVisible,
  serviceAdvisorySeverityPriority,
  type ServiceAdvisoryCreateInput,
  type ServiceAdvisorySeverity,
  type ServiceAdvisorySurface,
  type ServiceAdvisoryTransitionInput,
} from '@/services/serviceAdvisoryPolicy';

export type PublicServiceAdvisory = {
  id: string;
  publicReference: string;
  title: string;
  message: string;
  severity: ServiceAdvisorySeverity;
  surface: ServiceAdvisorySurface;
  endsAt: string | null;
};

export class ServiceAdvisoryError extends Error {
  constructor(readonly code: 'INVALID_TRANSITION' | 'MISSING' | 'VERSION_CONFLICT') {
    super(code);
    this.name = 'ServiceAdvisoryError';
  }
}

function advisorySnapshot(advisory: {
  endsAt: Date | null;
  id: string;
  message: string;
  publicReference: string;
  resolvedAt: Date | null;
  severity: string;
  startsAt: Date | null;
  status: string;
  surface: string;
  title: string;
  version: number;
}) {
  return JSON.stringify({
    endsAt: advisory.endsAt?.toISOString() ?? null,
    id: advisory.id,
    message: advisory.message,
    publicReference: advisory.publicReference,
    resolvedAt: advisory.resolvedAt?.toISOString() ?? null,
    severity: advisory.severity,
    startsAt: advisory.startsAt?.toISOString() ?? null,
    status: advisory.status,
    surface: advisory.surface,
    title: advisory.title,
    version: advisory.version,
  });
}

function createPublicReference(now: Date) {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  return `ADV-${date}-${suffix}`;
}

export async function createServiceAdvisory(input: {
  actorUserId: string;
  advisory: ServiceAdvisoryCreateInput;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (transaction) => {
    const advisory = await transaction.serviceAdvisory.create({
      data: {
        ...input.advisory,
        createdById: input.actorUserId,
        publicReference: createPublicReference(now),
      },
    });
    await transaction.serviceAdvisoryEvent.create({
      data: {
        action: 'CREATED',
        actorUserId: input.actorUserId,
        advisoryId: advisory.id,
        reason: input.reason,
        snapshotJson: advisorySnapshot(advisory),
      },
    });
    return advisory;
  });
}

export async function transitionServiceAdvisory(input: {
  actorUserId: string;
  advisoryId: string;
  now?: Date;
  transition: ServiceAdvisoryTransitionInput;
}) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.serviceAdvisory.findUnique({
      where: { id: input.advisoryId },
    });
    if (!current) throw new ServiceAdvisoryError('MISSING');
    if (!isServiceAdvisoryStatus(current.status)) {
      throw new ServiceAdvisoryError('INVALID_TRANSITION');
    }
    if (current.version !== input.transition.expectedVersion) {
      throw new ServiceAdvisoryError('VERSION_CONFLICT');
    }
    if (!canTransitionServiceAdvisory(current.status, input.transition.targetStatus)) {
      throw new ServiceAdvisoryError('INVALID_TRANSITION');
    }
    if (
      input.transition.targetStatus === 'SCHEDULED' &&
      (!current.startsAt || current.startsAt <= now)
    ) {
      throw new ServiceAdvisoryError('INVALID_TRANSITION');
    }
    if (input.transition.targetStatus === 'ACTIVE' && current.startsAt && current.startsAt > now) {
      throw new ServiceAdvisoryError('INVALID_TRANSITION');
    }

    const updated = await transaction.serviceAdvisory.updateMany({
      data: {
        resolvedAt: input.transition.targetStatus === 'RESOLVED' ? now : null,
        status: input.transition.targetStatus,
        version: { increment: 1 },
      },
      where: { id: current.id, version: current.version },
    });
    if (updated.count !== 1) throw new ServiceAdvisoryError('VERSION_CONFLICT');
    const advisory = await transaction.serviceAdvisory.findUniqueOrThrow({
      where: { id: current.id },
    });
    await transaction.serviceAdvisoryEvent.create({
      data: {
        action: `STATUS_${input.transition.targetStatus}`,
        actorUserId: input.actorUserId,
        advisoryId: advisory.id,
        reason: input.transition.reason,
        snapshotJson: advisorySnapshot(advisory),
      },
    });
    return advisory;
  });
}

function isMissingAdvisorySchema(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'P2021' || error.code === 'P2022';
}

export async function getVisibleServiceAdvisories(
  now = new Date(),
): Promise<PublicServiceAdvisory[]> {
  try {
    const advisories = await prisma.serviceAdvisory.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
    });

    return advisories
      .filter(
        (advisory) =>
          isServiceAdvisoryVisible(advisory, now) &&
          isServiceAdvisorySeverity(advisory.severity) &&
          isServiceAdvisorySurface(advisory.surface),
      )
      .map((advisory) => ({
        id: advisory.id,
        publicReference: advisory.publicReference,
        title: advisory.title,
        message: advisory.message,
        severity: advisory.severity as ServiceAdvisorySeverity,
        surface: advisory.surface as ServiceAdvisorySurface,
        endsAt: advisory.endsAt?.toISOString() ?? null,
      }))
      .sort(
        (left, right) =>
          serviceAdvisorySeverityPriority(right.severity) -
          serviceAdvisorySeverityPriority(left.severity),
      )
      .slice(0, 3);
  } catch (error) {
    if (isMissingAdvisorySchema(error)) {
      console.warn('Service advisories are unavailable until the database migration is applied.');
      return [];
    }
    throw error;
  }
}
