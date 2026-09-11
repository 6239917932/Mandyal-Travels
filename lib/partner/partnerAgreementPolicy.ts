export const PARTNER_AGREEMENT_VERSION = '1.0';
export const PARTNER_AGREEMENT_EFFECTIVE_DATE = '2026-09-11';

export type PartnerAgreementType = 'HOTEL' | 'CAR' | 'BUS';

export const PARTNER_AGREEMENTS: Record<
  PartnerAgreementType,
  { contentSha256: string; documentPath: string; title: string }
> = {
  HOTEL: {
    contentSha256: 'ec3777982d93d5adf37afac00dbac773a4cc09f0729d767993cfb05222a3ee65',
    documentPath: '/legal/partner-agreements/Mandyal_Hotel_Partner_Agreement_v1.0.docx',
    title: 'Hotel Partner Agreement',
  },
  CAR: {
    contentSha256: 'd750f9ea3017333384f18a4a3312f427e18025f1298040a7985f4207de6ad81c',
    documentPath: '/legal/partner-agreements/Mandyal_Car_Partner_Agreement_v1.0.docx',
    title: 'Car Partner Agreement',
  },
  BUS: {
    contentSha256: '6ebcd7620f4fc924f8f9a5182da0e6db67bb814fc93b56043a33a889f8ca13bd',
    documentPath: '/legal/partner-agreements/Mandyal_Bus_Partner_Agreement_v1.0.docx',
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
