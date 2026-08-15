import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';

export type MobileMessagingChannel = 'SMS' | 'WHATSAPP';

export async function sendMobileMessage(input: {
  channel: MobileMessagingChannel;
  dedupeKey: string;
  recipient: string;
  text: string;
  templateId?: string;
}) {
  const endpoint = process.env.MOBILE_MESSAGING_ENDPOINT ?? '';
  const apiKey = process.env.MOBILE_MESSAGING_API_KEY;
  const sender = input.channel === 'SMS' ? process.env.SMS_SENDER_ID : process.env.WHATSAPP_SENDER;
  const allowedHosts = parseAllowedProviderHosts(process.env.MOBILE_MESSAGING_ALLOWED_HOSTS);
  if (!apiKey || !sender || !isAllowedProviderEndpoint(endpoint, allowedHosts))
    throw new Error('MOBILE_MESSAGING_NOT_CONFIGURED');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.dedupeKey,
    },
    body: JSON.stringify({
      channel: input.channel.toLowerCase(),
      recipient: input.recipient,
      sender,
      templateId: input.templateId,
      text: input.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('MOBILE_MESSAGING_PROVIDER_UNAVAILABLE');
  const payload = (await response.json()) as { id?: unknown };
  if (typeof payload.id !== 'string') throw new Error('MOBILE_MESSAGING_PROVIDER_INVALID_RESPONSE');
  return { providerMessageId: payload.id.slice(0, 200) };
}
