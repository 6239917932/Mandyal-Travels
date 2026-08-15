import { isAllowedProviderEndpoint } from '@/lib/integrations/providerEndpoint';

export interface TransactionalEmailInput {
  dedupeKey: string;
  html: string;
  subject: string;
  text: string;
  to: string;
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const endpoint = process.env.EMAIL_PROVIDER_ENDPOINT ?? '';
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  let configuredHost = '';
  try {
    configuredHost = new URL(endpoint).hostname;
  } catch {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }
  if (!apiKey || !from || !configuredHost || !isAllowedProviderEndpoint(endpoint, [configuredHost]))
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.dedupeKey,
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('EMAIL_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as { id?: unknown };
  if (typeof payload.id !== 'string') throw new Error('EMAIL_PROVIDER_INVALID_RESPONSE');
  return { providerMessageId: payload.id.slice(0, 200) };
}
