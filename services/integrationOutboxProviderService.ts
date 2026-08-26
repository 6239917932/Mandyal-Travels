import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';
import type { IntegrationEventEnvelope } from '@/services/integrationOutboxService';

const PROVIDER_TIMEOUT_MS = 10_000;
const MAXIMUM_PAYLOAD_BYTES = 64 * 1_024;

type IntegrationOutboxProviderConfiguration = {
  apiKey: string;
  endpoint: string;
};

export function integrationOutboxProviderConfiguration(): IntegrationOutboxProviderConfiguration {
  const endpoint = process.env.INTEGRATION_OUTBOX_ENDPOINT ?? '';
  const apiKey = (process.env.INTEGRATION_OUTBOX_API_KEY ?? '').trim();
  const allowedHosts = parseAllowedProviderHosts(process.env.INTEGRATION_OUTBOX_ALLOWED_HOSTS);
  if (
    apiKey.length < 16 ||
    /replace|example|change-me/i.test(apiKey) ||
    !isAllowedProviderEndpoint(endpoint, allowedHosts)
  ) {
    throw new Error('INTEGRATION_OUTBOX_PROVIDER_NOT_CONFIGURED');
  }
  return { apiKey, endpoint };
}

export async function deliverIntegrationOutboxEvent(
  event: IntegrationEventEnvelope,
): Promise<void> {
  const { apiKey, endpoint } = integrationOutboxProviderConfiguration();

  const body = JSON.stringify(event);
  if (Buffer.byteLength(body, 'utf8') > MAXIMUM_PAYLOAD_BYTES) {
    throw new Error('INTEGRATION_OUTBOX_PAYLOAD_TOO_LARGE');
  }
  const response = await fetch(endpoint, {
    body,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': event.eventId,
    },
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error('INTEGRATION_OUTBOX_PROVIDER_UNAVAILABLE');
  const acknowledgement: unknown = await response.json();
  if (
    !acknowledgement ||
    typeof acknowledgement !== 'object' ||
    Array.isArray(acknowledgement) ||
    (acknowledgement as { accepted?: unknown }).accepted !== true ||
    (acknowledgement as { eventId?: unknown }).eventId !== event.eventId
  ) {
    throw new Error('INTEGRATION_OUTBOX_PROVIDER_INVALID_RESPONSE');
  }
}
