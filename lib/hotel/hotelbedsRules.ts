import { createHash } from 'node:crypto';

export type HotelbedsEnvironment = 'evaluation' | 'production';

export interface HotelbedsConfiguration {
  apiKey: string;
  environment: HotelbedsEnvironment;
  mutualTls?: {
    ca?: string;
    certificate: string;
    privateKey: string;
  };
  secret: string;
}

export interface HotelbedsConfigurationPosture {
  configured: boolean;
  enabled: boolean;
  environment: HotelbedsEnvironment;
  mutualTlsConfigured: boolean;
  productionBlocked: boolean;
}

const PLACEHOLDER_PATTERN = /^(?:replace|example|your[-_]|test[-_]?key)/i;

function configuredSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && !PLACEHOLDER_PATTERN.test(normalized) ? normalized : undefined;
}

function decodedPem(value: string | undefined, label: string): string | undefined {
  const encoded = configuredSecret(value);
  if (!encoded) return undefined;
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8').trim();
    if (!decoded.startsWith('-----BEGIN ') || !decoded.includes('-----END ')) {
      throw new Error();
    }
    return `${decoded}\n`;
  } catch {
    throw new Error(`${label} must be a base64-encoded PEM value.`);
  }
}

function hotelbedsEnvironment(value: string | undefined): HotelbedsEnvironment {
  return value === 'production' ? 'production' : 'evaluation';
}

export function inspectHotelbedsConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): HotelbedsConfigurationPosture {
  const providerEnvironment = hotelbedsEnvironment(environment.HOTELBEDS_ENVIRONMENT);
  const certificateConfigured = Boolean(configuredSecret(environment.HOTELBEDS_MTLS_CERT_BASE64));
  const privateKeyConfigured = Boolean(configuredSecret(environment.HOTELBEDS_MTLS_KEY_BASE64));
  return {
    configured: Boolean(
      configuredSecret(environment.HOTELBEDS_API_KEY) &&
      configuredSecret(environment.HOTELBEDS_SECRET),
    ),
    enabled: environment.HOTELBEDS_ENABLED === 'true',
    environment: providerEnvironment,
    mutualTlsConfigured: certificateConfigured && privateKeyConfigured,
    productionBlocked:
      environment.NODE_ENV === 'production' && providerEnvironment !== 'production',
  };
}

export function readHotelbedsConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): HotelbedsConfiguration | undefined {
  if (environment.HOTELBEDS_ENABLED !== 'true') return undefined;
  const apiKey = configuredSecret(environment.HOTELBEDS_API_KEY);
  const secret = configuredSecret(environment.HOTELBEDS_SECRET);
  const certificate = decodedPem(
    environment.HOTELBEDS_MTLS_CERT_BASE64,
    'HOTELBEDS_MTLS_CERT_BASE64',
  );
  const privateKey = decodedPem(environment.HOTELBEDS_MTLS_KEY_BASE64, 'HOTELBEDS_MTLS_KEY_BASE64');
  const ca = decodedPem(environment.HOTELBEDS_MTLS_CA_BASE64, 'HOTELBEDS_MTLS_CA_BASE64');
  const providerEnvironment = environment.HOTELBEDS_ENVIRONMENT;
  if (!apiKey || !secret) {
    throw new Error('Hotelbeds is enabled without complete server credentials.');
  }
  if (providerEnvironment !== 'evaluation' && providerEnvironment !== 'production') {
    throw new Error('HOTELBEDS_ENVIRONMENT must be evaluation or production.');
  }
  if (Boolean(certificate) !== Boolean(privateKey)) {
    throw new Error('Hotelbeds mTLS requires both a client certificate and private key.');
  }
  if (environment.NODE_ENV === 'production' && providerEnvironment !== 'production') {
    throw new Error('Hotelbeds evaluation access cannot be enabled in production.');
  }
  return {
    apiKey,
    environment: providerEnvironment,
    ...(certificate && privateKey
      ? { mutualTls: { ...(ca ? { ca } : {}), certificate, privateKey } }
      : {}),
    secret,
  };
}

export function hotelbedsApiOrigin(environment: HotelbedsEnvironment): string {
  return environment === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';
}

export function hotelbedsMutualTlsOrigin(environment: HotelbedsEnvironment): string {
  return environment === 'production'
    ? 'https://api-mtls.hotelbeds.com'
    : 'https://api-mtls.test.hotelbeds.com';
}

export function createHotelbedsSignature(
  configuration: Pick<HotelbedsConfiguration, 'apiKey' | 'secret'>,
  epochSeconds: number,
): string {
  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 1) {
    throw new Error('Hotelbeds signature time must be a positive epoch second.');
  }
  return createHash('sha256')
    .update(`${configuration.apiKey}${configuration.secret}${epochSeconds}`, 'utf8')
    .digest('hex');
}
