import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  HotelOperationalDocumentRuleError,
  normalizeHotelOperationalDocumentProfile,
  normalizeHotelOperationalDocumentVersion,
} from '@/lib/pms/operationalDocuments';

const MAX_PROPERTIES = 100;

export class PartnerOperationalDocumentError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const propertySelection = {
  contactEmail: true,
  contactPhone: true,
  displayName: true,
  documentFooterText: true,
  documentHeaderText: true,
  documentShowContact: true,
  documentTemplate: true,
  documentTheme: true,
  documentVersion: true,
  id: true,
} as const;

export async function getPartnerOperationalDocumentWorkspace(partnerId: string) {
  const properties = await prisma.partnerProperty.findMany({
    orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    select: propertySelection,
    take: MAX_PROPERTIES + 1,
    where: { listingSource: 'MANAGED', partnerId, status: 'ACTIVE' },
  });
  return {
    properties: properties.slice(0, MAX_PROPERTIES),
    safetyLimitReached: properties.length > MAX_PROPERTIES,
  } as const;
}

export async function updatePartnerOperationalDocumentProfile(input: {
  expectedVersion: unknown;
  partnerId: string;
  propertyId: string;
  values: Record<string, unknown>;
}) {
  let settings;
  let expectedVersion;
  try {
    settings = normalizeHotelOperationalDocumentProfile(input.values);
    expectedVersion = normalizeHotelOperationalDocumentVersion(input.expectedVersion);
  } catch (error) {
    if (error instanceof HotelOperationalDocumentRuleError) {
      throw new PartnerOperationalDocumentError(error.code, error.message);
    }
    throw error;
  }

  const property = await prisma.partnerProperty.findFirst({
    select: { id: true },
    where: {
      id: input.propertyId,
      listingSource: 'MANAGED',
      partnerId: input.partnerId,
      status: 'ACTIVE',
    },
  });
  if (!property) {
    throw new PartnerOperationalDocumentError(
      'PROPERTY_NOT_FOUND',
      'The managed property was not found.',
    );
  }

  const changed = await prisma.partnerProperty.updateMany({
    data: {
      documentFooterText: settings.footerText,
      documentHeaderText: settings.headerText,
      documentShowContact: settings.showPropertyContact,
      documentTemplate: settings.template,
      documentTheme: settings.theme,
      documentVersion: { increment: 1 },
    },
    where: { documentVersion: expectedVersion, id: property.id },
  });
  if (changed.count !== 1) {
    throw new PartnerOperationalDocumentError(
      'DOCUMENT_PROFILE_CHANGED',
      'These document settings changed in another session. Refresh and review them before saving.',
    );
  }
  return prisma.partnerProperty.findUniqueOrThrow({
    select: propertySelection,
    where: { id: property.id },
  });
}
