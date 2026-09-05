export type ListingRiskFinding = Readonly<{
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
}>;

const suspiciousClaim = /\b(guaranteed|official|government approved|best in india|100% safe)\b/i;

export function evaluateVehicleListingRisk(input: {
  cancellationPolicy: string;
  pickupLocation: string;
  dropoffLocation: string;
  pricePerDay: number;
  registrationNumber?: string | null;
  totalUnits: number;
  vehicleName: string;
}): ListingRiskFinding[] {
  const findings: ListingRiskFinding[] = [];
  if (!input.registrationNumber?.trim()) {
    findings.push({
      code: 'VEHICLE_REGISTRATION_MISSING',
      severity: 'HIGH',
      summary:
        'A registration number was not supplied; ownership and vehicle identity require review.',
    });
  }
  if (input.pricePerDay < 500) {
    findings.push({
      code: 'VEHICLE_PRICE_OUTLIER_LOW',
      severity: 'MEDIUM',
      summary:
        'The daily price is unusually low and should be checked for bait pricing or a unit error.',
    });
  }
  if (input.totalUnits > 50) {
    findings.push({
      code: 'VEHICLE_FLEET_SIZE_OUTLIER',
      severity: 'MEDIUM',
      summary:
        'The declared fleet size is large enough to require supporting ownership or authorization evidence.',
    });
  }
  if (input.pickupLocation.trim().toLowerCase() === input.dropoffLocation.trim().toLowerCase()) {
    findings.push({
      code: 'VEHICLE_ROUTE_SAME_LOCATION',
      severity: 'LOW',
      summary: 'Pickup and drop-off locations are identical; confirm that this is intentional.',
    });
  }
  if (suspiciousClaim.test(`${input.vehicleName} ${input.cancellationPolicy}`)) {
    findings.push({
      code: 'LISTING_UNVERIFIED_CLAIM',
      severity: 'MEDIUM',
      summary:
        'The listing contains a high-confidence claim that requires documentary verification.',
    });
  }
  return findings;
}

export function vehicleMayBePublished(input: {
  approvalStatus: string;
  publicationStatus: string;
  status: string;
}) {
  return (
    input.status === 'ACTIVE' &&
    input.approvalStatus === 'APPROVED' &&
    input.publicationStatus === 'PUBLISHED'
  );
}

export function evaluatePropertyListingRisk(input: {
  description: string;
  displayName: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  streetAddress: string;
}): ListingRiskFinding[] {
  const findings: ListingRiskFinding[] = [];
  if (input.latitude === 0 && input.longitude === 0) {
    findings.push({
      code: 'PROPERTY_COORDINATES_MISSING',
      severity: 'HIGH',
      summary: 'The property has no usable map coordinates; its location must be verified.',
    });
  }
  if (input.streetAddress.trim().length < 10) {
    findings.push({
      code: 'PROPERTY_ADDRESS_INCOMPLETE',
      severity: 'HIGH',
      summary: 'The street address is too short for reliable property verification.',
    });
  }
  if (!input.imageUrl || /unsplash\.com/i.test(input.imageUrl)) {
    findings.push({
      code: 'PROPERTY_IMAGE_NOT_VERIFIED',
      severity: 'MEDIUM',
      summary:
        'The primary image is missing or appears to be a stock image and requires ownership review.',
    });
  }
  if (suspiciousClaim.test(`${input.displayName} ${input.description}`)) {
    findings.push({
      code: 'LISTING_UNVERIFIED_CLAIM',
      severity: 'MEDIUM',
      summary:
        'The listing contains a high-confidence claim that requires documentary verification.',
    });
  }
  return findings;
}
