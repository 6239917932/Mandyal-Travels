import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type RateLimitAction =
  'ANALYTICS_EVENT' | 'CUSTOMER_SUPPORT_CREATE' | 'LOGIN' | 'PASSWORD_CHANGE' | 'REGISTER';

type RateLimitOptions = {
  action: RateLimitAction;
  identifier: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function hashKey(action: RateLimitAction, identifier: string): string {
  return createHash('sha256').update(`${action}:${identifier}`).digest('hex');
}

export function getRequestRateLimitIdentifier(request: Request, accountIdentifier: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwardedFor || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return `${address.slice(0, 100)}:${accountIdentifier.slice(0, 320)}`;
}

export async function consumeRateLimit({
  action,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const keyHash = hashKey(action, identifier);

  await prisma.requestRateLimit.deleteMany({
    where: { updatedAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
  });

  return prisma.$transaction(async (transaction) => {
    const current = await transaction.requestRateLimit.findUnique({ where: { keyHash } });

    if (current?.blockedUntil && current.blockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.blockedUntil.getTime() - now.getTime()) / 1000),
        ),
      };
    }

    const windowExpired = !current || now.getTime() - current.windowStartedAt.getTime() >= windowMs;
    if (windowExpired) {
      await transaction.requestRateLimit.upsert({
        create: { action, attempts: 1, keyHash, windowStartedAt: now },
        update: { action, attempts: 1, blockedUntil: null, windowStartedAt: now },
        where: { keyHash },
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const attempts = current.attempts + 1;
    if (attempts > limit) {
      const blockedUntil = new Date(now.getTime() + windowMs);
      await transaction.requestRateLimit.update({
        data: { attempts, blockedUntil },
        where: { keyHash },
      });
      return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    }

    await transaction.requestRateLimit.update({ data: { attempts }, where: { keyHash } });
    return { allowed: true, retryAfterSeconds: 0 };
  });
}

export async function clearRateLimit(action: RateLimitAction, identifier: string): Promise<void> {
  await prisma.requestRateLimit.deleteMany({ where: { keyHash: hashKey(action, identifier) } });
}
