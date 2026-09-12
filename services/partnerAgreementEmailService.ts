import 'server-only';

import { prisma } from '@/lib/prisma';
import { PARTNER_AGREEMENTS } from '@/lib/partner/partnerAgreementPolicy';
import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { sendTransactionalEmail } from '@/services/emailProviderService';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendPartnerAgreementEmail(applicationId: string) {
  const application = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
  if (
    !application ||
    application.agreementEmailStatus === 'SENT' ||
    !application.agreementVersion ||
    !application.agreementDocumentPath ||
    !application.agreementContentHash ||
    !['HOTEL', 'CAR', 'BUS'].includes(application.partnerType)
  ) {
    return;
  }
  const claimed = await prisma.partnerApplication.updateMany({
    data: { agreementEmailError: '', agreementEmailStatus: 'SENDING' },
    where: {
      agreementEmailStatus: { in: ['PENDING', 'FAILED'] },
      id: application.id,
    },
  });
  if (claimed.count !== 1) return;

  const agreement = PARTNER_AGREEMENTS[application.partnerType as 'HOTEL' | 'CAR' | 'BUS'];
  const documentUrl = new URL(agreement.documentPath, resolvePublicPortalOrigin()).toString();
  const reference = application.id;
  const text = `Dear ${application.contactName},

Thank you for applying to join the Mandyal Travels supplier network.

Download your ${agreement.title}, version ${application.agreementVersion}: ${documentUrl}

Please review every page, complete the partner and signatory details, sign or e-sign it, affix your business stamp if available, and reply to this email with the complete signed copy. Include application reference ${reference}.

Your application remains pending until Mandyal Travels verifies the authorised representative's identity and records the complete signed agreement. Mandyal Travels may request licences, permits, insurance, tax, safety, vehicle, driver, or other operating records before activation or during an audit or risk review.

Regards,
Mandyal Travels Support`;
  const safeName = escapeHtml(application.contactName);
  const safeTitle = escapeHtml(agreement.title);
  const safeVersion = escapeHtml(application.agreementVersion);
  const safeUrl = escapeHtml(documentUrl);
  const safeReference = escapeHtml(reference);

  try {
    await sendTransactionalEmail({
      dedupeKey: `partner-agreement:${application.id}:${application.agreementVersion}`,
      html: `<p>Dear ${safeName},</p><p>Thank you for applying to join the Mandyal Travels supplier network.</p><p><a href="${safeUrl}">Download your ${safeTitle}</a> (version ${safeVersion}).</p><p>Please review every page, complete the partner and signatory details, sign or e-sign it, affix your business stamp if available, and reply to this email with the complete signed copy. Include application reference <strong>${safeReference}</strong>.</p><p>Your application remains pending until Mandyal Travels verifies the authorised representative's identity and records the complete signed agreement. Mandyal Travels may request licences, permits, insurance, tax, safety, vehicle, driver, or other operating records before activation or during an audit or risk review.</p><p>Regards,<br>Mandyal Travels Support</p>`,
      subject: `Action required: sign your Mandyal Travels ${agreement.title}`,
      text,
      to: application.contactEmail,
    });
    await prisma.partnerApplication.update({
      data: {
        agreementEmailError: '',
        agreementEmailSentAt: new Date(),
        agreementEmailStatus: 'SENT',
      },
      where: { id: application.id },
    });
  } catch (error) {
    await prisma.partnerApplication.update({
      data: {
        agreementEmailError: error instanceof Error ? error.message.slice(0, 200) : 'SEND_FAILED',
        agreementEmailStatus: 'FAILED',
      },
      where: { id: application.id },
    });
  }
}
