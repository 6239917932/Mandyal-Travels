import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';

export async function sendPushNotification(input: {
  dedupeKey: string;
  deviceToken: string;
  title: string;
  body: string;
  deepLink?: string;
}) {
  const endpoint = process.env.PUSH_PROVIDER_ENDPOINT ?? '';
  const apiKey = process.env.PUSH_PROVIDER_API_KEY;
  const allowedHosts = parseAllowedProviderHosts(process.env.PUSH_PROVIDER_ALLOWED_HOSTS);
  if (!apiKey || !isAllowedProviderEndpoint(endpoint, allowedHosts))
    throw new Error('PUSH_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.dedupeKey,
    },
    body: JSON.stringify({
      token: input.deviceToken,
      notification: { title: input.title, body: input.body },
      data: input.deepLink ? { deepLink: input.deepLink } : {},
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('PUSH_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as { id?: unknown };
  if (typeof payload.id !== 'string') throw new Error('PUSH_PROVIDER_INVALID_RESPONSE');
  return { providerMessageId: payload.id.slice(0, 200) };
}
