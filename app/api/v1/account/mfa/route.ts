import { NextResponse } from 'next/server';

import { isSameOriginMutation, readJsonObject } from '@/lib/api/request';
import { consumeRateLimit, getRequestRateLimitIdentifier } from '@/lib/auth/rateLimit';
import {
  createRecoveryCodes,
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  requiresMfaEnrollmentVerification,
  totpUri,
  verifyTotp,
} from '@/lib/auth/mfa';
import { getCurrentSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { hashRecoveryCodes, verifyUserSecondFactor } from '@/services/mfaService';

const MFA_MUTATION_LIMIT = 10;
const MFA_MUTATION_WINDOW_MS = 10 * 60 * 1000;

async function authorizeMfaMutation(request: Request) {
  if (!isSameOriginMutation(request)) {
    return {
      response: NextResponse.json(
        { error: 'This request must originate from the Mandyal Travels portal.' },
        { status: 403 },
      ),
      session: null,
    };
  }
  const session = await getCurrentSession();
  if (!session) {
    return {
      response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }),
      session: null,
    };
  }
  const rateLimit = await consumeRateLimit({
    action: 'MFA_MUTATION',
    identifier: getRequestRateLimitIdentifier(request, session.user.id),
    limit: MFA_MUTATION_LIMIT,
    windowMs: MFA_MUTATION_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return {
      response: NextResponse.json(
        { error: 'Too many security changes were attempted. Please wait before trying again.' },
        { headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) }, status: 429 },
      ),
      session: null,
    };
  }
  return { response: null, session };
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const credential = await prisma.userMfaCredential.findUnique({
    where: { userId: session.user.id },
    include: { recoveryCodes: { where: { usedAt: null } } },
  });
  return NextResponse.json({
    data: {
      enabled: Boolean(credential?.enabledAt),
      recoveryCodesRemaining: credential?.recoveryCodes.length ?? 0,
    },
  });
}

export async function POST(request: Request) {
  const authorization = await authorizeMfaMutation(request);
  if (authorization.response) return authorization.response;
  const { session } = authorization;
  try {
    const current = await prisma.userMfaCredential.findUnique({
      where: { userId: session.user.id },
      select: { enabledAt: true },
    });
    if (requiresMfaEnrollmentVerification(current?.enabledAt)) {
      const body = await readJsonObject(request);
      const code = typeof body?.code === 'string' ? body.code : '';
      if (!(await verifyUserSecondFactor(session.user.id, code))) {
        return NextResponse.json(
          { error: 'Verify the current authenticator or a recovery code before re-enrolling.' },
          { status: 403 },
        );
      }
    }
    const secret = createTotpSecret();
    await prisma.userMfaCredential.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, secretCiphertext: encryptTotpSecret(secret) },
      update: { secretCiphertext: encryptTotpSecret(secret), enabledAt: null },
    });
    return NextResponse.json({ data: { setupUri: totpUri(session.user.email, secret) } });
  } catch (error) {
    console.error('MFA enrollment failed.', error);
    return NextResponse.json({ error: 'MFA enrollment is not configured.' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await authorizeMfaMutation(request);
  if (authorization.response) return authorization.response;
  const { session } = authorization;
  const body = await readJsonObject(request);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  const credential = await prisma.userMfaCredential.findUnique({
    where: { userId: session.user.id },
  });
  if (!credential || !verifyTotp(decryptTotpSecret(credential.secretCiphertext), code)) {
    return NextResponse.json({ error: 'Enter a valid authenticator code.' }, { status: 400 });
  }
  const codes = createRecoveryCodes();
  const hashes = await hashRecoveryCodes(codes);
  await prisma.$transaction([
    prisma.userMfaRecoveryCode.deleteMany({ where: { userId: session.user.id } }),
    prisma.userMfaCredential.update({
      where: { id: credential.id },
      data: {
        enabledAt: new Date(),
        recoveryCodes: {
          create: hashes.map((codeHash) => ({ codeHash, userId: session.user.id })),
        },
      },
    }),
  ]);
  return NextResponse.json({ data: { recoveryCodes: codes } });
}

export async function DELETE(request: Request) {
  const authorization = await authorizeMfaMutation(request);
  if (authorization.response) return authorization.response;
  const { session } = authorization;
  const body = await readJsonObject(request);
  const code = typeof body?.code === 'string' ? body.code : '';
  if (!(await verifyUserSecondFactor(session.user.id, code))) {
    return NextResponse.json(
      { error: 'Enter a valid authenticator or recovery code.' },
      { status: 400 },
    );
  }
  await prisma.userMfaCredential.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ data: { enabled: false } });
}
