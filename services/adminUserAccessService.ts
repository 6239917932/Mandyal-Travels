import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  type UserAccessChangeRequest,
  isUserAccessStatus,
  userAccessConfirmation,
  userAccessTargetStatus,
} from '@/services/adminUserAccessRules';

export type AdminUserAccessErrorCode =
  | 'ACTOR_NOT_AUTHORIZED'
  | 'CONFIRMATION_MISMATCH'
  | 'LAST_ACTIVE_ADMIN'
  | 'MISSING_USER'
  | 'SELF_SUSPENSION'
  | 'TRANSITION_NOT_ALLOWED'
  | 'VERSION_CONFLICT';

export class AdminUserAccessError extends Error {
  constructor(readonly code: AdminUserAccessErrorCode) {
    super(code);
    this.name = 'AdminUserAccessError';
  }
}

export async function changeUserAccess(input: {
  actorUserId: string;
  request: UserAccessChangeRequest;
  targetUserId: string;
}) {
  return prisma.$transaction(
    async (transaction) => {
      const actor = await transaction.user.findUnique({
        select: { accessStatus: true, role: true },
        where: { id: input.actorUserId },
      });
      if (actor?.accessStatus !== 'ACTIVE' || actor.role !== 'PLATFORM_ADMIN') {
        throw new AdminUserAccessError('ACTOR_NOT_AUTHORIZED');
      }
      const target = await transaction.user.findUnique({
        select: {
          accessStatus: true,
          accessVersion: true,
          email: true,
          id: true,
          role: true,
        },
        where: { id: input.targetUserId },
      });
      if (!target) throw new AdminUserAccessError('MISSING_USER');
      if (!isUserAccessStatus(target.accessStatus)) {
        throw new AdminUserAccessError('TRANSITION_NOT_ALLOWED');
      }
      if (target.accessVersion !== input.request.expectedVersion) {
        throw new AdminUserAccessError('VERSION_CONFLICT');
      }
      if (
        input.request.confirmation !== userAccessConfirmation(input.request.action, target.email)
      ) {
        throw new AdminUserAccessError('CONFIRMATION_MISMATCH');
      }
      if (input.request.action === 'SUSPEND' && target.id === input.actorUserId) {
        throw new AdminUserAccessError('SELF_SUSPENSION');
      }

      const toStatus = userAccessTargetStatus(target.accessStatus, input.request.action);
      if (!toStatus) throw new AdminUserAccessError('TRANSITION_NOT_ALLOWED');

      if (input.request.action === 'SUSPEND' && target.role === 'PLATFORM_ADMIN') {
        const activeAdministratorCount = await transaction.user.count({
          where: { accessStatus: 'ACTIVE', role: 'PLATFORM_ADMIN' },
        });
        if (activeAdministratorCount <= 1) {
          throw new AdminUserAccessError('LAST_ACTIVE_ADMIN');
        }
      }

      const changedAt = new Date();
      const nextVersion = target.accessVersion + 1;
      const updated = await transaction.user.updateMany({
        data: {
          accessChangedAt: changedAt,
          accessStatus: toStatus,
          accessVersion: nextVersion,
        },
        where: {
          accessStatus: target.accessStatus,
          accessVersion: target.accessVersion,
          id: target.id,
        },
      });
      if (updated.count !== 1) throw new AdminUserAccessError('VERSION_CONFLICT');

      await transaction.userSession.deleteMany({ where: { userId: target.id } });
      await transaction.userAccessEvent.create({
        data: {
          action: input.request.action,
          actorUserId: input.actorUserId,
          fromStatus: target.accessStatus,
          reason: input.request.reason,
          toStatus,
          userId: target.id,
          version: nextVersion,
        },
      });

      return {
        accessChangedAt: changedAt.toISOString(),
        accessStatus: toStatus,
        accessVersion: nextVersion,
        userId: target.id,
      };
    },
    { isolationLevel: 'Serializable' },
  );
}
