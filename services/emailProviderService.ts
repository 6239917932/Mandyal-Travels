import 'server-only';

import {
  isAllowedProviderEndpoint,
  parseAllowedProviderHosts,
} from '@/lib/integrations/providerEndpoint';
import { sendTlsSmtpMessage } from '@/lib/integrations/smtpTransport';

export interface TransactionalEmailInput {
  dedupeKey: string;
  html: string;
  subject: string;
  text: string;
  to: string;
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim().toLowerCase() ?? '';
  const smtpUser = process.env.EMAIL_SMTP_USER?.trim() ?? '';
  const smtpPassword = process.env.EMAIL_SMTP_PASSWORD ?? '';
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT ?? '465');
  const smtpAllowedHosts = parseAllowedProviderHosts(process.env.EMAIL_SMTP_ALLOWED_HOSTS);
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (smtpHost || smtpUser || smtpPassword) {
    if (
      !from ||
      !smtpUser ||
      !smtpPassword ||
      smtpPort !== 465 ||
      !smtpAllowedHosts.includes(smtpHost)
    ) {
      throw new Error('EMAIL_SMTP_NOT_CONFIGURED');
    }
    return sendTlsSmtpMessage({
      host: smtpHost,
      message: {
        from,
        html: input.html,
        subject: input.subject,
        text: input.text,
        to: input.to,
      },
      password: smtpPassword,
      port: smtpPort,
      user: smtpUser,
    });
  }

  const endpoint = process.env.EMAIL_PROVIDER_ENDPOINT ?? '';
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const allowedHosts = parseAllowedProviderHosts(process.env.EMAIL_PROVIDER_ALLOWED_HOSTS);
  if (!apiKey || !from || !isAllowedProviderEndpoint(endpoint, allowedHosts))
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
