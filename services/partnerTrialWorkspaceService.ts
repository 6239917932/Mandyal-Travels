import { prisma } from '@/lib/prisma';
import {
  type PlatformFeatureKey,
  resolvePlatformFeatureState,
} from '@/services/platformFeatureFlagRules';

const PRIVATE_TRIAL_FEATURES = [
  'TRIAL_PARTNER_WORKSPACES',
  'PAID_PARTNER_ONBOARDING',
  'PARTNER_PAYOUT_ONBOARDING',
  'PUBLIC_PARTNER_LISTINGS',
  'LIVE_MARKETPLACE_PAYMENTS',
  'CAR_MARKETPLACE',
] as const satisfies readonly PlatformFeatureKey[];

type TrialFeatureKey = (typeof PRIVATE_TRIAL_FEATURES)[number];

export class PartnerTrialWorkspaceError extends Error {
  constructor(
    readonly code:
      | 'ACCOUNT_NOT_FOUND'
      | 'ACCOUNT_NOT_VERIFIED'
      | 'ACCOUNT_UNAVAILABLE'
      | 'CONFIRMATION_MISMATCH'
      | 'INVALID_REQUEST'
      | 'PARTNER_ALREADY_ASSIGNED'
      | 'PENDING_APPLICATION_EXISTS'
      | 'ROLE_CONFLICT'
      | 'TRIAL_MODE_UNAVAILABLE',
    message: string,
  ) {
    super(message);
  }
}

function privateTrialModeEnabled(flags: Map<string, boolean>) {
  return (
    flags.get('TRIAL_PARTNER_WORKSPACES') === true &&
    flags.get('PAID_PARTNER_ONBOARDING') === false &&
    flags.get('PARTNER_PAYOUT_ONBOARDING') === false &&
    flags.get('PUBLIC_PARTNER_LISTINGS') === false &&
    flags.get('LIVE_MARKETPLACE_PAYMENTS') === false &&
    flags.get('CAR_MARKETPLACE') === false
  );
}

async function readPrivateTrialMode(client: Pick<typeof prisma, 'platformFeatureFlag'> = prisma) {
  const overrides = await client.platformFeatureFlag.findMany({
    select: { enabled: true, key: true },
    where: { key: { in: [...PRIVATE_TRIAL_FEATURES] } },
  });
  const byKey = new Map(overrides.map((override) => [override.key, override.enabled]));
  const states = new Map<TrialFeatureKey, boolean>();
  for (const key of PRIVATE_TRIAL_FEATURES) {
    states.set(key, byKey.get(key) ?? resolvePlatformFeatureState(key, undefined).defaultEnabled);
  }
  return privateTrialModeEnabled(states);
}

export async function getPrivateTrialWorkspaceState() {
  return { enabled: await readPrivateTrialMode() };
}

export async function grantPrivateHotelTrialWorkspace(input: {
  actorUserId: string;
  confirmation: string;
  email: string;
  reason: string;
  workspaceName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const workspaceName = input.workspaceName.trim().replace(/\s+/g, ' ');
  const reason = input.reason.trim().replace(/\s+/g, ' ');
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    workspaceName.length < 2 ||
    workspaceName.length > 120 ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    throw new PartnerTrialWorkspaceError(
      'INVALID_REQUEST',
      'Enter a valid account email, workspace name, and a reason between 10 and 500 characters.',
    );
  }
  if (input.confirmation.trim().toLowerCase() !== email) {
    throw new PartnerTrialWorkspaceError(
      'CONFIRMATION_MISMATCH',
      'Type the exact trial account email to confirm this access grant.',
    );
  }

  return prisma.$transaction(async (transaction) => {
    if (!(await readPrivateTrialMode(transaction))) {
      throw new PartnerTrialWorkspaceError(
        'TRIAL_MODE_UNAVAILABLE',
        'Private trial access is available only while paid onboarding, payouts, public listings, live payments, and the car marketplace are disabled.',
      );
    }
    const user = await transaction.user.findUnique({ where: { email } });
    if (!user) {
      throw new PartnerTrialWorkspaceError(
        'ACCOUNT_NOT_FOUND',
        'Create and verify the dedicated trial account before granting PMS access.',
      );
    }
    if (user.accessStatus !== 'ACTIVE') {
      throw new PartnerTrialWorkspaceError(
        'ACCOUNT_UNAVAILABLE',
        'The trial account must be active before PMS access can be granted.',
      );
    }
    if (!user.emailVerifiedAt) {
      throw new PartnerTrialWorkspaceError(
        'ACCOUNT_NOT_VERIFIED',
        'Verify the trial account email before granting PMS access.',
      );
    }
    if (user.role !== 'CUSTOMER') {
      throw new PartnerTrialWorkspaceError(
        'ROLE_CONFLICT',
        'Private PMS trials must start from a separate customer account.',
      );
    }
    if (await transaction.supplyPartnerMember.findUnique({ where: { userId: user.id } })) {
      throw new PartnerTrialWorkspaceError(
        'PARTNER_ALREADY_ASSIGNED',
        'This account already has a supplier workspace.',
      );
    }
    if (
      await transaction.partnerApplication.findFirst({
        select: { id: true },
        where: { applicantUserId: user.id, status: 'PENDING' },
      })
    ) {
      throw new PartnerTrialWorkspaceError(
        'PENDING_APPLICATION_EXISTS',
        'This account already has a pending KYC application. Review that application instead.',
      );
    }

    const partner = await transaction.supplyPartner.create({
      data: {
        contactEmail: email,
        name: workspaceName,
        status: 'ACTIVE',
        type: 'HOTEL',
      },
    });
    await transaction.supplyPartnerMember.create({
      data: { partnerId: partner.id, role: 'ADMIN', userId: user.id },
    });
    await transaction.user.update({
      data: { role: 'PARTNER_ADMIN' },
      where: { id: user.id },
    });
    await transaction.partnerAuditLog.create({
      data: {
        action: 'PRIVATE_TRIAL_WORKSPACE_GRANTED',
        actorUserId: input.actorUserId,
        entityId: user.id,
        entityType: 'USER',
        metadataJson: JSON.stringify({
          accountEmail: email,
          reason,
          safeguards: [
            'NO_PUBLIC_LISTINGS',
            'NO_LIVE_PAYMENTS',
            'NO_PAYOUTS',
            'NO_PAID_ONBOARDING',
          ],
        }),
        partnerId: partner.id,
        summary: 'Private hotel PMS trial workspace granted without KYC or publication rights.',
      },
    });
    return { accountEmail: email, partnerId: partner.id, workspaceName: partner.name };
  });
}
