import { decryptTotpSecret, verifyTotp } from '@/lib/auth/mfa';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/prisma';

export async function hashRecoveryCodes(codes: readonly string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(code)));
}

export async function verifyUserSecondFactor(
  userId: string,
  suppliedCode: string,
): Promise<boolean> {
  const credential = await prisma.userMfaCredential.findUnique({
    where: { userId },
    include: { recoveryCodes: { where: { usedAt: null } } },
  });
  if (!credential?.enabledAt) return true;

  const normalized = suppliedCode.replace(/[\s-]/g, '').toUpperCase();
  if (verifyTotp(decryptTotpSecret(credential.secretCiphertext), normalized)) {
    await prisma.userMfaCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  for (const recoveryCode of credential.recoveryCodes) {
    if (await verifyPassword(normalized, recoveryCode.codeHash)) {
      await prisma.$transaction([
        prisma.userMfaRecoveryCode.update({
          where: { id: recoveryCode.id },
          data: { usedAt: new Date() },
        }),
        prisma.userMfaCredential.update({
          where: { id: credential.id },
          data: { lastUsedAt: new Date() },
        }),
      ]);
      return true;
    }
  }
  return false;
}
