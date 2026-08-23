import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encryptionKey(): Buffer {
  const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY ?? '', 'base64');
  if (key.length !== 32)
    throw new Error('MFA_ENCRYPTION_KEY must contain 32 base64-encoded bytes.');
  return key;
}

function encodeBase32(value: Buffer): string {
  let bits = '';
  for (const byte of value) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let index = 0; index < bits.length; index += 5) {
    output += BASE32[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return output;
}

function decodeBase32(value: string): Buffer {
  let bits = '';
  for (const character of value.replace(/=+$/g, '').toUpperCase()) {
    const index = BASE32.indexOf(character);
    if (index < 0) throw new Error('Invalid TOTP secret.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function createTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptTotpSecret(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted MFA secret.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function totpAt(secret: string, timestamp: number): string {
  const counter = Math.floor(timestamp / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(binary).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  return [-1, 0, 1].some((window) => totpAt(secret, now + window * 30_000) === code);
}

export function requiresMfaEnrollmentVerification(enabledAt: Date | null | undefined): boolean {
  return enabledAt instanceof Date && Number.isFinite(enabledAt.valueOf());
}

export function totpUri(email: string, secret: string): string {
  const label = encodeURIComponent(`Mandyal Travels:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Mandyal%20Travels&algorithm=SHA1&digits=6&period=30`;
}

export function createRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(6).toString('hex').toUpperCase());
}
