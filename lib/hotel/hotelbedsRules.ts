import { createHash } from 'node:crypto';

export type HotelbedsEnvironment = 'evaluation' | 'production';

export interface HotelbedsConfiguration {
  apiKey: string;
  environment: HotelbedsEnvironment;
  secret: string;
}

export interface HotelbedsConfigurationPosture {
  configured: boolean;
  enabled: boolean;
  environment: HotelbedsEnvironment;
  productionBlocked: boolean;
}

const PLACEHOLDER_PATTERN = /^(?:replace|example|your[-_]|test[-_]?key)/i;

function configuredSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && !PLACEHOLDER_PATTERN.test(normalized) ? normalized : undefined;
}

function hotelbedsEnvironment(value: string | undefined): HotelbedsEnvironment {
  return value === 'production' ? 'production' : 'evaluation';
}

export function inspectHotelbedsConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): HotelbedsConfigurationPosture {
  const providerEnvironment = hotelbedsEnvironment(environment.HOTELBEDS_ENVIRONMENT);
  return {
    configured: Boolean(
      configuredSecret(environment.HOTELBEDS_API_KEY) &&
      configuredSecret(environment.HOTELBEDS_SECRET),
    ),
    enabled: environment.HOTELBEDS_ENABLED === 'true',
    environment: providerEnvironment,
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
  const providerEnvironment = environment.HOTELBEDS_ENVIRONMENT;
  if (!apiKey || !secret) {
    throw new Error('Hotelbeds is enabled without complete server credentials.');
  }
  if (providerEnvironment !== 'evaluation' && providerEnvironment !== 'production') {
    throw new Error('HOTELBEDS_ENVIRONMENT must be evaluation or production.');
  }
  if (environment.NODE_ENV === 'production' && providerEnvironment !== 'production') {
    throw new Error('Hotelbeds evaluation access cannot be enabled in production.');
  }
  return { apiKey, environment: providerEnvironment, secret };
}

export function hotelbedsApiOrigin(environment: HotelbedsEnvironment): string {
  return environment === 'production'
    ? 'https://api.hotelbeds.com'
    : 'https://api.test.hotelbeds.com';
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
