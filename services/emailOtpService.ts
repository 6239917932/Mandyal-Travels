import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  createEmailOtpCode,
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_TTL_MS,
  hashEmailOtpCode,
  verifyEmailOtpHash,
} from '@/lib/auth/emailOtp';
import { renderNotificationTemplate } from '@/lib/notifications/delivery';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/services/emailProviderService';

export type EmailOtpPurpose = 'LOGIN' | 'REGISTRATION';

function secret() {
  const value = process.env.SESSION_SECRET?.trim() ?? '';
  if (value.length < 32) throw new Error('EMAIL_OTP_SECRET_NOT_CONFIGURED');
  return value;
}

export function isEmailOtpRequired() {
  return process.env.AUTH_EMAIL_OTP_REQUIRED === 'true';
}

export async function issueEmailOtp(input: {
  email: string;
  firstName: string;
  purpose: EmailOtpPurpose;
  userId: string;
}) {
  const id = randomUUID();
  const code = createEmailOtpCode();
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
  await prisma.$transaction([
    prisma.emailOtpChallenge.updateMany({
      data: { consumedAt: new Date() },
      where: { consumedAt: null, purpose: input.purpose, userId: input.userId },
    }),
    prisma.emailOtpChallenge.create({
      data: {
        codeHash: hashEmailOtpCode(id, code, secret()),
        expiresAt,
        id,
        purpose: input.purpose,
        userId: input.userId,
      },
    }),
  ]);
  try {
    await sendTransactionalEmail({
      dedupeKey: `email-otp:${id}`,
      html: renderNotificationTemplate(
        '<p>Hello {{firstName}},</p><p>Your Mandyal Travels verification code is:</p>' +
          '<p><strong>{{code}}</strong></p><p>It expires in 10 minutes. Never share this code.</p>',
        { code, firstName: input.firstName },
        { escapeValues: true },
      ),
      subject: 'Your Mandyal Travels verification code',
      text: `Hello ${input.firstName},\n\nYour Mandyal Travels verification code is ${code}. It expires in 10 minutes. Never share this code.`,
      to: input.email,
    });
  } catch (error) {
    await prisma.emailOtpChallenge.deleteMany({ where: { id } });
    throw error;
  }
  return { challengeId: id, expiresAt };
}

export async function verifyEmailOtp(input: {
  challengeId: string;
  code: string;
  purpose: EmailOtpPurpose;
  userId: string;
}) {
  if (!/^[0-9]{6}$/.test(input.code) || !/^[0-9a-f-]{36}$/i.test(input.challengeId)) return false;
  return prisma.$transaction(async (transaction) => {
    const challenge = await transaction.emailOtpChallenge.findUnique({
      where: { id: input.challengeId },
    });
    if (
      !challenge ||
      challenge.userId !== input.userId ||
      challenge.purpose !== input.purpose ||
      challenge.consumedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= EMAIL_OTP_MAX_ATTEMPTS
    ) {
      return false;
    }
    const valid = verifyEmailOtpHash(
      challenge.codeHash,
      hashEmailOtpCode(challenge.id, input.code, secret()),
    );
    if (!valid) {
      await transaction.emailOtpChallenge.update({
        data: { attempts: { increment: 1 } },
        where: { id: challenge.id },
      });
      return false;
    }
    const claimed = await transaction.emailOtpChallenge.updateMany({
      data: { consumedAt: new Date() },
      where: { consumedAt: null, id: challenge.id },
    });
    return claimed.count === 1;
  });
}
