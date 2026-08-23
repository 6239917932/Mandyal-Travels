import 'server-only';

import { createPasswordResetToken } from '@/lib/auth/passwordReset';
import { renderNotificationTemplate } from '@/lib/notifications/delivery';
import { prisma } from '@/lib/prisma';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import {
  ACCOUNT_SECURITY_ACTIONS,
  createAccountSecurityEventData,
} from '@/services/accountSecurityService';
import { sendTransactionalEmail } from '@/services/emailProviderService';

export async function sendPasswordResetEmail(user: {
  email: string;
  firstName: string;
  id: string;
}): Promise<void> {
  const now = new Date();
  const resetToken = createPasswordResetToken(now);
  let resetUrl: string;
  try {
    resetUrl = `${resolvePublicPortalOrigin()}/reset-password#token=${resetToken.token}`;
    await prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({ where: { expiresAt: { lte: now } } });
      await transaction.passwordResetToken.updateMany({
        data: { usedAt: now },
        where: { userId: user.id, usedAt: null },
      });
      await transaction.passwordResetToken.create({
        data: {
          expiresAt: resetToken.expiresAt,
          tokenHash: resetToken.tokenHash,
          userId: user.id,
        },
      });
    });
  } catch (error) {
    console.error('Password reset notification could not be prepared.', error);
    return;
  }

  try {
    await sendTransactionalEmail({
      dedupeKey: `password-reset:${resetToken.tokenHash}`,
      html: renderNotificationTemplate(
        '<p>Hello {{firstName}},</p>' +
          '<p>Use the secure link below to reset your Mandyal Travels password. ' +
          'It expires in 30 minutes and can be used only once.</p>' +
          '<p><a href="{{resetUrl}}">Reset your password</a></p>' +
          '<p>If you did not request this, you can ignore this email.</p>',
        { firstName: user.firstName, resetUrl },
        { escapeValues: true },
      ),
      subject: 'Reset your Mandyal Travels password',
      text:
        `Hello ${user.firstName},\n\nReset your Mandyal Travels password within 30 minutes: ` +
        `${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      to: user.email,
    });
  } catch (error) {
    try {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash: resetToken.tokenHash } });
    } catch (cleanupError) {
      console.error('Unused password reset token cleanup failed.', cleanupError);
    }
    console.error('Password reset notification could not be delivered.', error);
    return;
  }

  try {
    await prisma.accountSecurityEvent.create({
      data: createAccountSecurityEventData({
        action: ACCOUNT_SECURITY_ACTIONS.PASSWORD_RESET_REQUESTED,
        summary: 'A password reset link was sent to your account email.',
        userId: user.id,
      }),
    });
  } catch (error) {
    console.error('Password reset request security event could not be recorded.', error);
  }
}
