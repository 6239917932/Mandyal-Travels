export const PARTNER_AGREEMENT_VERSION = '1.1';
export const PARTNER_AGREEMENT_EFFECTIVE_DATE = '2026-09-13';

export type PartnerAgreementType = 'HOTEL' | 'CAR' | 'BUS';

export const PARTNER_AGREEMENTS: Record<
  PartnerAgreementType,
  { contentSha256: string; documentPath: string; title: string }
> = {
  HOTEL: {
    contentSha256: 'b9223f0404b33f28f93049208ef89669816a0e9ad9a6041ee6d08124e5b0c73d',
    documentPath: '/legal/partner-agreements/Mandyal_Hotel_Partner_Agreement_v1.1.docx',
    title: 'Hotel Partner Agreement',
  },
  CAR: {
    contentSha256: '28e082f24e9247d6c1f848a533c0fc757ecd15e299ce8f6f0052b1430c370aa2',
    documentPath: '/legal/partner-agreements/Mandyal_Car_Partner_Agreement_v1.1.docx',
    title: 'Car Partner Agreement',
  },
  BUS: {
    contentSha256: 'f5ff7c5260277c84b036a051f430e12349d2caac38d283732d30b46bdad229ff',
    documentPath: '/legal/partner-agreements/Mandyal_Bus_Partner_Agreement_v1.1.docx',
    title: 'Bus Partner Agreement',
  },
};

export const PARTNER_APPLICATION_ACKNOWLEDGEMENTS = [
  'ackAuthority',
  'ackAgreement',
  'ackIdentity',
  'ackOperatingRecords',
  'ackElectronicDelivery',
  'ackSignedReturn',
  'ackApprovalGate',
  'ackMaterialChanges',
  'ackServiceResponsibility',
] as const;

export type PartnerApplicationAcknowledgement =
  (typeof PARTNER_APPLICATION_ACKNOWLEDGEMENTS)[number];

export function isPartnerAgreementType(value: unknown): value is PartnerAgreementType {
  return value === 'HOTEL' || value === 'CAR' || value === 'BUS';
}

export function readPartnerApplicationAcknowledgements(
  body: Record<string, unknown>,
): Record<PartnerApplicationAcknowledgement, true> | null {
  if (PARTNER_APPLICATION_ACKNOWLEDGEMENTS.some((key) => body[key] !== 'on')) return null;
  return Object.fromEntries(
    PARTNER_APPLICATION_ACKNOWLEDGEMENTS.map((key) => [key, true]),
  ) as Record<PartnerApplicationAcknowledgement, true>;
}

export function agreementForPartnerType(value: unknown) {
  return isPartnerAgreementType(value) ? PARTNER_AGREEMENTS[value] : null;
}
