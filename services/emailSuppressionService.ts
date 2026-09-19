import 'server-only';

import {
  emailRecipientHash,
  type EmailProviderEventInput,
} from '@/lib/notifications/emailSuppression';
import { prisma } from '@/lib/prisma';
import { storeEmailProviderEvent } from '@/lib/notifications/emailSuppressionStore';

function suppressionHashSecret(): string {
  return process.env.EMAIL_SUPPRESSION_HASH_SECRET?.trim() ?? '';
}

export async function isEmailRecipientSuppressed(recipient: string): Promise<boolean> {
  const recipientHash = emailRecipientHash(recipient, suppressionHashSecret());
  return Boolean(
    await prisma.emailSuppression.findUnique({
      where: { recipientHash },
      select: { id: true },
    }),
  );
}

export async function recordEmailProviderEvent(input: {
  event: EmailProviderEventInput;
  payload: string;
  provider: string;
}): Promise<{ duplicate: boolean }> {
  return storeEmailProviderEvent(prisma, { ...input, hashSecret: suppressionHashSecret() });
}
