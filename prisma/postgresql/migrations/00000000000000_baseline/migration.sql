-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "accessStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessVersion" INTEGER NOT NULL DEFAULT 0,
    "accessChangedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "marketingConsentAt" TIMESTAMP(3),
    "bookingEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTraveler" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT 'OTHER',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ACCOUNT',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "UserConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataPrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "resolutionNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DataPrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataPrivacyRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataPrivacyRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMfaCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMfaCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOTEL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "commissionBasisPoints" INTEGER NOT NULL DEFAULT 2000,
    "settlementDelayDays" INTEGER NOT NULL DEFAULT 2,
    "payoutDestinationVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyPartnerMember" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyPartnerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProperty" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "hotelSlug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL DEFAULT 'HOTEL',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "listingSource" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "publicationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvalNote" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "locality" TEXT NOT NULL DEFAULT '',
    "tehsil" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "locationAliasesJson" TEXT NOT NULL DEFAULT '[]',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'India',
    "streetAddress" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "starRating" INTEGER NOT NULL DEFAULT 3,
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "amenitiesJson" TEXT NOT NULL DEFAULT '[]',
    "policiesJson" TEXT NOT NULL DEFAULT '[]',
    "languagesJson" TEXT NOT NULL DEFAULT '[]',
    "landmarksJson" TEXT NOT NULL DEFAULT '[]',
    "imageUrlsJson" TEXT NOT NULL DEFAULT '[]',
    "minimumCheckInAge" INTEGER NOT NULL DEFAULT 18,
    "childrenAllowed" BOOLEAN NOT NULL DEFAULT true,
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "smokingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSupplierConnection" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "credentialRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "lastHealthStatus" TEXT NOT NULL DEFAULT 'NOT_TESTED',
    "lastHealthAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightSupplierConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSupplierOperation" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerRef" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightSupplierOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBusRoute" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "boardingPoint" TEXT NOT NULL,
    "droppingPoint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerBusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBusTrip" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceDate" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "busType" TEXT NOT NULL,
    "seatCapacity" INTEGER NOT NULL,
    "pricePerSeat" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amenitiesJson" TEXT NOT NULL DEFAULT '[]',
    "cancellationPolicy" TEXT NOT NULL,
    "refundable" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerBusTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBusSeatHold" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerBusSeatHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBusSeatHoldSeat" (
    "id" TEXT NOT NULL,
    "holdId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerBusSeatHoldSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBusReservation" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "customerTripId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "seatNumbersJson" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerBusReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRoomType" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bedDescription" TEXT NOT NULL,
    "inventoryCount" INTEGER NOT NULL,
    "maximumAdults" INTEGER NOT NULL,
    "maximumChildren" INTEGER NOT NULL,
    "maximumGuests" INTEGER NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "taxesAndFees" INTEGER NOT NULL,
    "ratePlanName" TEXT NOT NULL,
    "mealPlan" TEXT NOT NULL DEFAULT 'room-only',
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "cancellationDescription" TEXT NOT NULL,
    "amenitiesJson" TEXT NOT NULL DEFAULT '[]',
    "imageUrl" TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "applicantUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "partnerId" TEXT,
    "businessName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "inventorySummary" TEXT NOT NULL,
    "legalBusinessName" TEXT NOT NULL DEFAULT '',
    "registeredAddress" TEXT NOT NULL DEFAULT '',
    "taxIdentifier" TEXT NOT NULL DEFAULT '',
    "registrationId" TEXT NOT NULL DEFAULT '',
    "identityType" TEXT NOT NULL DEFAULT '',
    "identityReference" TEXT NOT NULL DEFAULT '',
    "kycStatus" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "kycConsentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerKycDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "partnerId" TEXT,
    "reviewedByUserId" TEXT,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fileVersion" INTEGER NOT NULL DEFAULT 0,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,
    "issuedOn" TEXT,
    "expiresOn" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerKycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerKycDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageStatus" TEXT NOT NULL DEFAULT 'INTENT_CREATED',
    "uploadIntentExpiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerKycDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerKycDocumentEvent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "partnerId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerKycDocumentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerHotelInventoryDay" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "stayDate" TEXT NOT NULL,
    "availableRooms" INTEGER NOT NULL,
    "nightlyRate" INTEGER,
    "minimumStayNights" INTEGER,
    "maximumStayNights" INTEGER,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stopSell" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerHotelInventoryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerVehicle" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "registrationExpiry" TEXT NOT NULL DEFAULT '',
    "insuranceExpiry" TEXT NOT NULL DEFAULT '',
    "permitExpiry" TEXT NOT NULL DEFAULT '',
    "fitnessExpiry" TEXT NOT NULL DEFAULT '',
    "pollutionExpiry" TEXT NOT NULL DEFAULT '',
    "transmission" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "bags" INTEGER NOT NULL,
    "fuelPolicy" TEXT NOT NULL,
    "mileagePolicy" TEXT NOT NULL,
    "cancellationPolicy" TEXT NOT NULL,
    "featuresJson" TEXT NOT NULL DEFAULT '[]',
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "pricePerDay" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalUnits" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "publicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvalNote" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgreementVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "governanceVersion" INTEGER NOT NULL DEFAULT 1,
    "effectiveAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAgreementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgreementVersionEvent" (
    "id" TEXT NOT NULL,
    "agreementVersionId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "legalApprovalReference" TEXT,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAgreementVersionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgreementRelease" (
    "key" TEXT NOT NULL,
    "agreementVersionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAgreementRelease_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PartnerPhoneVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "phoneLast4" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgreementAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementVersionId" TEXT NOT NULL,
    "phoneVerificationId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "acceptedName" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgentHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAgreementAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerOnboardingCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "waiverPercent" INTEGER NOT NULL DEFAULT 100,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerOnboardingCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerOnboardingCouponEvent" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromActive" BOOLEAN NOT NULL,
    "toActive" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerOnboardingCouponEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerOnboardingOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponId" TEXT,
    "agreementAcceptanceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "priceVersion" TEXT NOT NULL,
    "oneTimeSetupAmount" INTEGER NOT NULL,
    "monthlySubscriptionAmount" INTEGER NOT NULL,
    "subtotalAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "dueNowAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "couponCodeSnapshot" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT '',
    "providerRef" TEXT,
    "checkoutUrl" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerOnboardingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerVehicleInventoryDay" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceDate" TEXT NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "pricePerDay" INTEGER,
    "stopSell" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerVehicleInventoryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerVehicleReservation" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerTripId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "pickupDate" TEXT NOT NULL,
    "dropoffDate" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerVehicleReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAuditLog" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "legalName" TEXT,
    "billingAddress" TEXT,
    "taxRegistrationId" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "defaultCabinClass" TEXT NOT NULL DEFAULT 'ECONOMY',
    "maximumTripAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyCustomerTravelRequest" (
    "businessTravelRequestId" TEXT NOT NULL,
    "agencyCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyCustomerTravelRequest_pkey" PRIMARY KEY ("businessTravelRequestId")
);

-- CreateTable
CREATE TABLE "BusinessSupportCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSupportCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "customerTripId" TEXT,
    "hotelBookingId" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSupportCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSupportCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPolicyVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL,
    "defaultCabinClass" TEXT NOT NULL,
    "maximumTripAmount" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TRAVELLER',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTravelRequest" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "policyVersionId" TEXT,
    "reviewedByUserId" TEXT,
    "productType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "estimatedAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "policyReason" TEXT NOT NULL,
    "policySnapshotJson" TEXT NOT NULL,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "bookingTotalAmount" INTEGER,
    "bookedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTrip" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "detailsJson" TEXT NOT NULL,
    "businessTravelRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestRateLimit" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationJobLease" (
    "jobKey" TEXT NOT NULL,
    "leaseTokenHash" TEXT NOT NULL,
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "lastStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "lastSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJobLease_pkey" PRIMARY KEY ("jobKey")
);

-- CreateTable
CREATE TABLE "AutomationJobRun" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "errorCode" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAdvisory" (
    "id" TEXT NOT NULL,
    "publicReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "surface" TEXT NOT NULL DEFAULT 'ALL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAdvisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAdvisoryEvent" (
    "id" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAdvisoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelbedsContentProperty" (
    "id" TEXT NOT NULL,
    "providerHotelCode" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "providerUpdatedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncCorrelationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelbedsContentProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityLock" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "checkInDate" TEXT NOT NULL DEFAULT '',
    "checkOutDate" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "inventorySource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelQuote" (
    "id" TEXT NOT NULL,
    "hotelSlug" TEXT NOT NULL DEFAULT '',
    "checkInDate" TEXT NOT NULL DEFAULT '',
    "checkOutDate" TEXT NOT NULL DEFAULT '',
    "ratePlanId" TEXT NOT NULL DEFAULT '',
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "nights" INTEGER NOT NULL,
    "quotedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "availabilityLockId" TEXT NOT NULL,

    CONSTRAINT "HotelQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCheckoutIntent" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "checkoutUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "walletCurrency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyLedger" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "pointsDelta" INTEGER NOT NULL DEFAULT 0,
    "walletDelta" INTEGER NOT NULL DEFAULT 0,
    "walletCurrency" TEXT NOT NULL DEFAULT 'INR',
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maxUses" INTEGER NOT NULL DEFAULT 20,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceComponent" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "PriceComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "accessTokenHash" TEXT,
    "hotelSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "operationalStatus" TEXT NOT NULL DEFAULT 'RESERVED',
    "assignedRoomNumbersJson" TEXT NOT NULL DEFAULT '[]',
    "partnerNote" TEXT NOT NULL DEFAULT '',
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT NOT NULL,
    "availabilityLockId" TEXT NOT NULL,
    "businessTravelRequestId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTaxSnapshot" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "supplyType" TEXT NOT NULL DEFAULT 'HOTEL_ACCOMMODATION',
    "vendorGstRegistered" BOOLEAN NOT NULL,
    "vendorBaseAmount" INTEGER NOT NULL,
    "customerTaxableAmount" INTEGER NOT NULL,
    "serviceGstAmount" INTEGER NOT NULL,
    "customerTotalAmount" INTEGER NOT NULL,
    "commissionGrossAmount" INTEGER NOT NULL,
    "commissionTaxableAmount" INTEGER NOT NULL,
    "commissionGstAmount" INTEGER NOT NULL,
    "gstTcsAmount" INTEGER NOT NULL DEFAULT 0,
    "incomeTaxTdsAmount" INTEGER NOT NULL DEFAULT 0,
    "gatewayFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "gatewayFeeGstAmount" INTEGER NOT NULL DEFAULT 0,
    "vendorSettlementAmount" INTEGER NOT NULL,
    "platformContributionAmount" INTEGER NOT NULL,
    "ecoGstLiabilityAmount" INTEGER NOT NULL DEFAULT 0,
    "calculationJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceTaxSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerVehicleMaintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "costAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerVehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationOutboxEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationOutboxReviewEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationOutboxReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelChannelConnection" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL DEFAULT 'CHANNEL_MANAGER',
    "status" TEXT NOT NULL DEFAULT 'PENDING_CONFIGURATION',
    "authenticationMode" TEXT NOT NULL DEFAULT 'EXTERNAL_SECRET',
    "externalAccountRef" TEXT NOT NULL DEFAULT '',
    "lastHealthAt" TIMESTAMP(3),
    "lastHealthStatus" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelChannelPropertyMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalPropertyRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelChannelPropertyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelChannelSyncRun" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'BIDIRECTIONAL',
    "scope" TEXT NOT NULL DEFAULT 'INVENTORY_RATES_RESTRICTIONS',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "reconciliationNote" TEXT NOT NULL DEFAULT '',
    "requestedByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelChannelSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "reviewedByUserId" TEXT,
    "resolutionNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettlement" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "grossAmount" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "taxWithheldAmount" INTEGER NOT NULL DEFAULT 0,
    "adjustmentAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "bookingCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculationJson" TEXT NOT NULL DEFAULT '{}',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettlementEvent" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSettlementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventName" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'PLATFORM',
    "funnelStage" TEXT NOT NULL,
    "entityRef" TEXT NOT NULL DEFAULT '',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchProjectionDocument" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "searchTerms" TEXT NOT NULL,
    "facetsJson" TEXT NOT NULL DEFAULT '{}',
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "sourceVersion" TEXT NOT NULL,
    "projectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchProjectionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchProjectionRebuildEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'HOTEL',
    "sourceCount" INTEGER NOT NULL,
    "projectedCount" INTEGER NOT NULL,
    "removedCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchProjectionRebuildEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "dedupeKey" TEXT NOT NULL,
    "variablesJson" TEXT NOT NULL DEFAULT '{}',
    "providerRef" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 6,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPhysicalRoom" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floorLabel" TEXT NOT NULL DEFAULT '',
    "housekeepingStatus" TEXT NOT NULL DEFAULT 'READY',
    "operationalStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPhysicalRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRatePlan" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "taxesAndFees" INTEGER NOT NULL,
    "mealPlan" TEXT NOT NULL DEFAULT 'room-only',
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "cancellationDescription" TEXT NOT NULL,
    "freeCancellationHours" INTEGER NOT NULL DEFAULT 48,
    "minimumStayNights" INTEGER NOT NULL DEFAULT 1,
    "maximumStayNights" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRatePlanInventoryDay" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "stayDate" TEXT NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRatePlanInventoryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelSlug" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedByUserId" TEXT,
    "partnerReply" TEXT,
    "partnerRepliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAmendment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "requestedCheckInDate" TEXT NOT NULL,
    "requestedCheckOutDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "requestedTotalAmount" INTEGER,

    CONSTRAINT "BookingAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingGuest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialRequests" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BookingGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "checkoutIntentId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNRECONCILED',
    "providerAmount" INTEGER,
    "providerCurrency" TEXT,
    "reconciliationNote" TEXT NOT NULL DEFAULT '',
    "reconciledAt" TIMESTAMP(3),
    "reconciledByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerRefundRef" TEXT,
    "requestedByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLedgerEntry" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "refundId" TEXT,
    "entryType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "partnerId" TEXT,
    "allocationKey" TEXT NOT NULL,
    "allocationType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialJournal" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "paymentId" TEXT,
    "refundId" TEXT,
    "currency" TEXT NOT NULL,
    "totalDebit" INTEGER NOT NULL,
    "totalCredit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "description" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialJournalPosting" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "partnerId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialJournalPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettlementLine" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "taxWithheldAmount" INTEGER NOT NULL DEFAULT 0,
    "adjustmentAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSettlementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayoutAccount" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerBeneficiaryRef" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountLast4" TEXT NOT NULL,
    "routingCodeMasked" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewReason" TEXT NOT NULL DEFAULT '',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayoutBatch" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "instructionCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "providerBatchRef" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayoutInstruction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "payoutAccountId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerPayoutRef" TEXT,
    "failureCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPayoutInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCampaign" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "productsJson" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "maximumDiscount" INTEGER NOT NULL,
    "minimumSubtotal" INTEGER NOT NULL,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "checkoutIntentId" TEXT,
    "bookingId" TEXT,
    "customerTripId" TEXT,
    "claimKey" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "code" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "finalTotal" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromActive" BOOLEAN NOT NULL,
    "toActive" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionCampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomInventoryOverride" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "stayDate" TEXT NOT NULL,
    "availableRooms" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomInventoryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeatureFlag" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changeReason" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PlatformFeatureFlagEvent" (
    "id" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFeatureFlagEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationContent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "summary" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "heroImageUrl" TEXT NOT NULL,
    "bestTimeToVisit" TEXT NOT NULL,
    "highlightsJson" TEXT NOT NULL DEFAULT '[]',
    "travelTipsJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "changeReason" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationContentEvent" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationContentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayoutAccountEvent" (
    "id" TEXT NOT NULL,
    "payoutAccountId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPayoutAccountEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerTaxProfile" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "gstRegistrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "gstin" TEXT NOT NULL DEFAULT '',
    "placeOfSupplyStateCode" TEXT NOT NULL DEFAULT '',
    "section9FiveApplicable" BOOLEAN NOT NULL DEFAULT false,
    "section194OExempt" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "effectiveFrom" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerTaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'FOOTER',
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_accessStatus_idx" ON "User"("role", "accessStatus");

-- CreateIndex
CREATE INDEX "UserAccessEvent_userId_createdAt_idx" ON "UserAccessEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserAccessEvent_actorUserId_createdAt_idx" ON "UserAccessEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserAccessEvent_action_createdAt_idx" ON "UserAccessEvent"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessEvent_userId_version_key" ON "UserAccessEvent"("userId", "version");

-- CreateIndex
CREATE INDEX "SavedTraveler_userId_updatedAt_idx" ON "SavedTraveler"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_usedAt_idx" ON "PasswordResetToken"("expiresAt", "usedAt");

-- CreateIndex
CREATE INDEX "UserConsentRecord_userId_purpose_recordedAt_idx" ON "UserConsentRecord"("userId", "purpose", "recordedAt");

-- CreateIndex
CREATE INDEX "UserConsentRecord_purpose_status_recordedAt_idx" ON "UserConsentRecord"("purpose", "status", "recordedAt");

-- CreateIndex
CREATE INDEX "DataPrivacyRequest_userId_requestType_requestedAt_idx" ON "DataPrivacyRequest"("userId", "requestType", "requestedAt");

-- CreateIndex
CREATE INDEX "DataPrivacyRequest_status_dueAt_idx" ON "DataPrivacyRequest"("status", "dueAt");

-- CreateIndex
CREATE INDEX "DataPrivacyRequest_reviewedByUserId_idx" ON "DataPrivacyRequest"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "DataPrivacyRequestEvent_requestId_createdAt_idx" ON "DataPrivacyRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "DataPrivacyRequestEvent_actorUserId_createdAt_idx" ON "DataPrivacyRequestEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserMfaCredential_userId_key" ON "UserMfaCredential"("userId");

-- CreateIndex
CREATE INDEX "UserMfaRecoveryCode_userId_usedAt_idx" ON "UserMfaRecoveryCode"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "UserMfaRecoveryCode_credentialId_usedAt_idx" ON "UserMfaRecoveryCode"("credentialId", "usedAt");

-- CreateIndex
CREATE INDEX "SupplyPartner_status_createdAt_idx" ON "SupplyPartner"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyPartnerMember_userId_key" ON "SupplyPartnerMember"("userId");

-- CreateIndex
CREATE INDEX "SupplyPartnerMember_partnerId_role_idx" ON "SupplyPartnerMember"("partnerId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyPartnerMember_partnerId_userId_key" ON "SupplyPartnerMember"("partnerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProperty_hotelSlug_key" ON "PartnerProperty"("hotelSlug");

-- CreateIndex
CREATE INDEX "PartnerProperty_partnerId_status_idx" ON "PartnerProperty"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerProperty_listingSource_publicationStatus_status_idx" ON "PartnerProperty"("listingSource", "publicationStatus", "status");

-- CreateIndex
CREATE INDEX "PartnerProperty_approvalStatus_submittedAt_idx" ON "PartnerProperty"("approvalStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "FlightSupplierConnection_partnerId_status_updatedAt_idx" ON "FlightSupplierConnection"("partnerId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlightSupplierConnection_partnerId_providerCode_environment_key" ON "FlightSupplierConnection"("partnerId", "providerCode", "environment");

-- CreateIndex
CREATE INDEX "FlightSupplierOperation_status_nextAttemptAt_createdAt_idx" ON "FlightSupplierOperation"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "FlightSupplierOperation_connectionId_createdAt_idx" ON "FlightSupplierOperation"("connectionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlightSupplierOperation_connectionId_correlationId_key" ON "FlightSupplierOperation"("connectionId", "correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBusRoute_code_key" ON "PartnerBusRoute"("code");

-- CreateIndex
CREATE INDEX "PartnerBusRoute_partnerId_status_idx" ON "PartnerBusRoute"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerBusRoute_origin_destination_status_idx" ON "PartnerBusRoute"("origin", "destination", "status");

-- CreateIndex
CREATE INDEX "PartnerBusTrip_serviceDate_status_idx" ON "PartnerBusTrip"("serviceDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBusTrip_routeId_serviceDate_departureTime_key" ON "PartnerBusTrip"("routeId", "serviceDate", "departureTime");

-- CreateIndex
CREATE INDEX "PartnerBusSeatHold_expiresAt_idx" ON "PartnerBusSeatHold"("expiresAt");

-- CreateIndex
CREATE INDEX "PartnerBusSeatHold_userId_expiresAt_idx" ON "PartnerBusSeatHold"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBusSeatHold_tripId_userId_key" ON "PartnerBusSeatHold"("tripId", "userId");

-- CreateIndex
CREATE INDEX "PartnerBusSeatHoldSeat_holdId_idx" ON "PartnerBusSeatHoldSeat"("holdId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBusSeatHoldSeat_tripId_seatNumber_key" ON "PartnerBusSeatHoldSeat"("tripId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBusReservation_confirmationCode_key" ON "PartnerBusReservation"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBusReservation_customerTripId_key" ON "PartnerBusReservation"("customerTripId");

-- CreateIndex
CREATE INDEX "PartnerBusReservation_tripId_status_idx" ON "PartnerBusReservation"("tripId", "status");

-- CreateIndex
CREATE INDEX "PartnerBusReservation_partnerId_status_createdAt_idx" ON "PartnerBusReservation"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRoomType_roomTypeId_key" ON "PartnerRoomType"("roomTypeId");

-- CreateIndex
CREATE INDEX "PartnerRoomType_propertyId_status_idx" ON "PartnerRoomType"("propertyId", "status");

-- CreateIndex
CREATE INDEX "PartnerApplication_status_createdAt_idx" ON "PartnerApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerApplication_applicantUserId_createdAt_idx" ON "PartnerApplication"("applicantUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerApplication_kycStatus_createdAt_idx" ON "PartnerApplication"("kycStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerKycDocument_applicationId_status_idx" ON "PartnerKycDocument"("applicationId", "status");

-- CreateIndex
CREATE INDEX "PartnerKycDocument_partnerId_status_expiresOn_idx" ON "PartnerKycDocument"("partnerId", "status", "expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerKycDocument_applicationId_documentType_key" ON "PartnerKycDocument"("applicationId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerKycDocumentVersion_objectKey_key" ON "PartnerKycDocumentVersion"("objectKey");

-- CreateIndex
CREATE INDEX "PartnerKycDocumentVersion_documentId_createdAt_idx" ON "PartnerKycDocumentVersion"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerKycDocumentVersion_storageStatus_uploadIntentExpires_idx" ON "PartnerKycDocumentVersion"("storageStatus", "uploadIntentExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerKycDocumentVersion_documentId_versionNumber_key" ON "PartnerKycDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "PartnerKycDocumentEvent_documentId_createdAt_idx" ON "PartnerKycDocumentEvent"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerKycDocumentEvent_applicationId_createdAt_idx" ON "PartnerKycDocumentEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerKycDocumentEvent_partnerId_createdAt_idx" ON "PartnerKycDocumentEvent"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerHotelInventoryDay_propertyId_stayDate_idx" ON "PartnerHotelInventoryDay"("propertyId", "stayDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerHotelInventoryDay_propertyId_roomTypeId_stayDate_key" ON "PartnerHotelInventoryDay"("propertyId", "roomTypeId", "stayDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerVehicle_code_key" ON "PartnerVehicle"("code");

-- CreateIndex
CREATE INDEX "PartnerVehicle_partnerId_status_idx" ON "PartnerVehicle"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerVehicle_pickupLocation_dropoffLocation_status_public_idx" ON "PartnerVehicle"("pickupLocation", "dropoffLocation", "status", "publicationStatus");

-- CreateIndex
CREATE INDEX "PartnerVehicle_approvalStatus_submittedAt_idx" ON "PartnerVehicle"("approvalStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "EmailOtpChallenge_userId_purpose_createdAt_idx" ON "EmailOtpChallenge"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOtpChallenge_expiresAt_consumedAt_idx" ON "EmailOtpChallenge"("expiresAt", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgreementVersion_version_key" ON "PartnerAgreementVersion"("version");

-- CreateIndex
CREATE INDEX "PartnerAgreementVersion_status_effectiveAt_idx" ON "PartnerAgreementVersion"("status", "effectiveAt");

-- CreateIndex
CREATE INDEX "PartnerAgreementVersionEvent_agreementVersionId_createdAt_idx" ON "PartnerAgreementVersionEvent"("agreementVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerAgreementVersionEvent_actorUserId_createdAt_idx" ON "PartnerAgreementVersionEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgreementVersionEvent_agreementVersionId_version_key" ON "PartnerAgreementVersionEvent"("agreementVersionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgreementRelease_agreementVersionId_key" ON "PartnerAgreementRelease"("agreementVersionId");

-- CreateIndex
CREATE INDEX "PartnerAgreementRelease_updatedByUserId_updatedAt_idx" ON "PartnerAgreementRelease"("updatedByUserId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPhoneVerification_providerRef_key" ON "PartnerPhoneVerification"("providerRef");

-- CreateIndex
CREATE INDEX "PartnerPhoneVerification_userId_status_expiresAt_idx" ON "PartnerPhoneVerification"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "PartnerAgreementAcceptance_agreementVersionId_acceptedAt_idx" ON "PartnerAgreementAcceptance"("agreementVersionId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgreementAcceptance_userId_agreementVersionId_key" ON "PartnerAgreementAcceptance"("userId", "agreementVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAgreementAcceptance_phoneVerificationId_agreementVer_key" ON "PartnerAgreementAcceptance"("phoneVerificationId", "agreementVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboardingCoupon_code_key" ON "PartnerOnboardingCoupon"("code");

-- CreateIndex
CREATE INDEX "PartnerOnboardingCoupon_active_startsAt_endsAt_idx" ON "PartnerOnboardingCoupon"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PartnerOnboardingCouponEvent_couponId_createdAt_idx" ON "PartnerOnboardingCouponEvent"("couponId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerOnboardingCouponEvent_actorUserId_createdAt_idx" ON "PartnerOnboardingCouponEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerOnboardingCouponEvent_createdAt_idx" ON "PartnerOnboardingCouponEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboardingCouponEvent_couponId_version_key" ON "PartnerOnboardingCouponEvent"("couponId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboardingOrder_agreementAcceptanceId_key" ON "PartnerOnboardingOrder"("agreementAcceptanceId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboardingOrder_idempotencyKey_key" ON "PartnerOnboardingOrder"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboardingOrder_providerRef_key" ON "PartnerOnboardingOrder"("providerRef");

-- CreateIndex
CREATE INDEX "PartnerOnboardingOrder_userId_status_createdAt_idx" ON "PartnerOnboardingOrder"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerOnboardingOrder_status_expiresAt_idx" ON "PartnerOnboardingOrder"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerOnboardingOrder_userId_couponId_key" ON "PartnerOnboardingOrder"("userId", "couponId");

-- CreateIndex
CREATE INDEX "PartnerVehicleInventoryDay_vehicleId_serviceDate_idx" ON "PartnerVehicleInventoryDay"("vehicleId", "serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerVehicleInventoryDay_vehicleId_serviceDate_key" ON "PartnerVehicleInventoryDay"("vehicleId", "serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerVehicleReservation_confirmationCode_key" ON "PartnerVehicleReservation"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerVehicleReservation_customerTripId_key" ON "PartnerVehicleReservation"("customerTripId");

-- CreateIndex
CREATE INDEX "PartnerVehicleReservation_partnerId_status_createdAt_idx" ON "PartnerVehicleReservation"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerVehicleReservation_vehicleId_pickupDate_dropoffDate__idx" ON "PartnerVehicleReservation"("vehicleId", "pickupDate", "dropoffDate", "status");

-- CreateIndex
CREATE INDEX "PartnerAuditLog_partnerId_createdAt_idx" ON "PartnerAuditLog"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerAuditLog_partnerId_action_createdAt_idx" ON "PartnerAuditLog"("partnerId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AccountSecurityEvent_userId_createdAt_idx" ON "AccountSecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AgencyCustomer_organizationId_status_createdAt_idx" ON "AgencyCustomer"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyCustomer_organizationId_email_key" ON "AgencyCustomer"("organizationId", "email");

-- CreateIndex
CREATE INDEX "AgencyCustomerTravelRequest_agencyCustomerId_createdAt_idx" ON "AgencyCustomerTravelRequest"("agencyCustomerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSupportCase_caseNumber_key" ON "BusinessSupportCase"("caseNumber");

-- CreateIndex
CREATE INDEX "BusinessSupportCase_organizationId_status_createdAt_idx" ON "BusinessSupportCase"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessSupportCase_createdByUserId_createdAt_idx" ON "BusinessSupportCase"("createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSupportCase_caseNumber_key" ON "CustomerSupportCase"("caseNumber");

-- CreateIndex
CREATE INDEX "CustomerSupportCase_userId_status_createdAt_idx" ON "CustomerSupportCase"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerSupportCase_status_updatedAt_idx" ON "CustomerSupportCase"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "CustomerSupportCase_customerTripId_idx" ON "CustomerSupportCase"("customerTripId");

-- CreateIndex
CREATE INDEX "CustomerSupportCase_hotelBookingId_idx" ON "CustomerSupportCase"("hotelBookingId");

-- CreateIndex
CREATE INDEX "CustomerSupportCaseEvent_caseId_createdAt_idx" ON "CustomerSupportCaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerSupportCaseEvent_actorUserId_createdAt_idx" ON "CustomerSupportCaseEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationPolicyVersion_organizationId_createdAt_idx" ON "OrganizationPolicyVersion"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPolicyVersion_organizationId_version_key" ON "OrganizationPolicyVersion"("organizationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_status_createdAt_idx" ON "OrganizationInvitation"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_status_expiresAt_idx" ON "OrganizationInvitation"("email", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "BusinessAuditLog_organizationId_createdAt_idx" ON "BusinessAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessAuditLog_organizationId_action_createdAt_idx" ON "BusinessAuditLog"("organizationId", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_key" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTravelRequest_idempotencyKey_key" ON "BusinessTravelRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BusinessTravelRequest_organizationId_status_createdAt_idx" ON "BusinessTravelRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessTravelRequest_requesterId_status_createdAt_idx" ON "BusinessTravelRequest"("requesterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessTravelRequest_policyVersionId_idx" ON "BusinessTravelRequest"("policyVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTrip_confirmationCode_key" ON "CustomerTrip"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTrip_businessTravelRequestId_key" ON "CustomerTrip"("businessTravelRequestId");

-- CreateIndex
CREATE INDEX "CustomerTrip_userId_createdAt_idx" ON "CustomerTrip"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerTrip_email_createdAt_idx" ON "CustomerTrip"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestRateLimit_keyHash_key" ON "RequestRateLimit"("keyHash");

-- CreateIndex
CREATE INDEX "RequestRateLimit_action_updatedAt_idx" ON "RequestRateLimit"("action", "updatedAt");

-- CreateIndex
CREATE INDEX "AutomationJobLease_leaseExpiresAt_idx" ON "AutomationJobLease"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "AutomationJobLease_lastStatus_updatedAt_idx" ON "AutomationJobLease"("lastStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationJobRun_correlationId_key" ON "AutomationJobRun"("correlationId");

-- CreateIndex
CREATE INDEX "AutomationJobRun_jobKey_startedAt_idx" ON "AutomationJobRun"("jobKey", "startedAt");

-- CreateIndex
CREATE INDEX "AutomationJobRun_status_startedAt_idx" ON "AutomationJobRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAdvisory_publicReference_key" ON "ServiceAdvisory"("publicReference");

-- CreateIndex
CREATE INDEX "ServiceAdvisory_status_startsAt_endsAt_idx" ON "ServiceAdvisory"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisory_createdAt_idx" ON "ServiceAdvisory"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisoryEvent_advisoryId_createdAt_idx" ON "ServiceAdvisoryEvent"("advisoryId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisoryEvent_actorUserId_createdAt_idx" ON "ServiceAdvisoryEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceAdvisoryEvent_action_createdAt_idx" ON "ServiceAdvisoryEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "HotelbedsContentProperty_active_fetchedAt_idx" ON "HotelbedsContentProperty"("active", "fetchedAt");

-- CreateIndex
CREATE INDEX "HotelbedsContentProperty_syncCorrelationId_idx" ON "HotelbedsContentProperty"("syncCorrelationId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelbedsContentProperty_language_providerHotelCode_key" ON "HotelbedsContentProperty"("language", "providerHotelCode");

-- CreateIndex
CREATE INDEX "AvailabilityLock_roomTypeId_status_expiresAt_idx" ON "AvailabilityLock"("roomTypeId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "HotelQuote_availabilityLockId_key" ON "HotelQuote"("availabilityLockId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckoutIntent_idempotencyKey_key" ON "PaymentCheckoutIntent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCheckoutIntent_providerRef_key" ON "PaymentCheckoutIntent"("providerRef");

-- CreateIndex
CREATE INDEX "PaymentCheckoutIntent_quoteId_status_createdAt_idx" ON "PaymentCheckoutIntent"("quoteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentCheckoutIntent_status_expiresAt_idx" ON "PaymentCheckoutIntent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_providerRef_receivedAt_idx" ON "PaymentProviderEvent"("providerRef", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_status_receivedAt_idx" ON "PaymentProviderEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderEvent_provider_providerEventId_key" ON "PaymentProviderEvent"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");

-- CreateIndex
CREATE INDEX "LoyaltyAccount_status_updatedAt_idx" ON "LoyaltyAccount"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "LoyaltyLedger_accountId_createdAt_idx" ON "LoyaltyLedger"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyLedger_accountId_entryType_referenceType_referenceId_key" ON "LoyaltyLedger"("accountId", "entryType", "referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_ownerUserId_status_idx" ON "ReferralCode"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "PriceComponent_quoteId_idx" ON "PriceComponent"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_confirmationCode_key" ON "Booking"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_accessTokenHash_key" ON "Booking"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_availabilityLockId_key" ON "Booking"("availabilityLockId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_businessTravelRequestId_key" ON "Booking"("businessTravelRequestId");

-- CreateIndex
CREATE INDEX "Booking_hotelSlug_operationalStatus_createdAt_idx" ON "Booking"("hotelSlug", "operationalStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceTaxSnapshot_bookingId_key" ON "MarketplaceTaxSnapshot"("bookingId");

-- CreateIndex
CREATE INDEX "MarketplaceTaxSnapshot_partnerId_createdAt_idx" ON "MarketplaceTaxSnapshot"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceTaxSnapshot_ruleVersion_createdAt_idx" ON "MarketplaceTaxSnapshot"("ruleVersion", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerVehicleMaintenance_vehicleId_startDate_endDate_idx" ON "PartnerVehicleMaintenance"("vehicleId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "PartnerVehicleMaintenance_status_startDate_idx" ON "PartnerVehicleMaintenance"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOutboxEvent_dedupeKey_key" ON "IntegrationOutboxEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_status_nextAttemptAt_createdAt_idx" ON "IntegrationOutboxEvent"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_aggregateType_aggregateId_createdAt_idx" ON "IntegrationOutboxEvent"("aggregateType", "aggregateId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_bookingId_createdAt_idx" ON "IntegrationOutboxEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationOutboxReviewEvent_eventId_createdAt_idx" ON "IntegrationOutboxReviewEvent"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationOutboxReviewEvent_actorUserId_createdAt_idx" ON "IntegrationOutboxReviewEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "HotelChannelConnection_partnerId_status_createdAt_idx" ON "HotelChannelConnection"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HotelChannelConnection_partnerId_providerName_externalAccou_key" ON "HotelChannelConnection"("partnerId", "providerName", "externalAccountRef");

-- CreateIndex
CREATE INDEX "HotelChannelPropertyMapping_propertyId_status_idx" ON "HotelChannelPropertyMapping"("propertyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HotelChannelPropertyMapping_connectionId_propertyId_key" ON "HotelChannelPropertyMapping"("connectionId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelChannelPropertyMapping_connectionId_externalPropertyRe_key" ON "HotelChannelPropertyMapping"("connectionId", "externalPropertyRef");

-- CreateIndex
CREATE INDEX "HotelChannelSyncRun_connectionId_status_createdAt_idx" ON "HotelChannelSyncRun"("connectionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "HotelChannelSyncRun_status_createdAt_idx" ON "HotelChannelSyncRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RiskSignal_status_severity_createdAt_idx" ON "RiskSignal"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "RiskSignal_subjectType_subjectId_createdAt_idx" ON "RiskSignal"("subjectType", "subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskSignal_signalType_createdAt_idx" ON "RiskSignal"("signalType", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerSettlement_status_periodEnd_createdAt_idx" ON "PartnerSettlement"("status", "periodEnd", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerSettlement_partnerId_status_periodEnd_idx" ON "PartnerSettlement"("partnerId", "status", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSettlement_partnerId_periodStart_periodEnd_key" ON "PartnerSettlement"("partnerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PartnerSettlementEvent_settlementId_createdAt_idx" ON "PartnerSettlementEvent"("settlementId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerSettlementEvent_actorUserId_createdAt_idx" ON "PartnerSettlementEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerSettlementEvent_createdAt_idx" ON "PartnerSettlementEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_occurredAt_idx" ON "AnalyticsEvent"("eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productType_funnelStage_occurredAt_idx" ON "AnalyticsEvent"("productType", "funnelStage", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_occurredAt_idx" ON "AnalyticsEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "SearchProjectionDocument_entityType_projectedAt_idx" ON "SearchProjectionDocument"("entityType", "projectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchProjectionDocument_entityType_entityId_key" ON "SearchProjectionDocument"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SearchProjectionRebuildEvent_entityType_createdAt_idx" ON "SearchProjectionRebuildEvent"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "SearchProjectionRebuildEvent_actorUserId_createdAt_idx" ON "SearchProjectionRebuildEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_templateKey_key" ON "NotificationTemplate"("templateKey");

-- CreateIndex
CREATE INDEX "NotificationTemplate_channel_status_updatedAt_idx" ON "NotificationTemplate"("channel", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_dedupeKey_key" ON "NotificationDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_createdAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_channel_status_createdAt_idx" ON "NotificationDelivery"("channel", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerPhysicalRoom_propertyId_housekeepingStatus_operation_idx" ON "PartnerPhysicalRoom"("propertyId", "housekeepingStatus", "operationalStatus");

-- CreateIndex
CREATE INDEX "PartnerPhysicalRoom_roomTypeId_operationalStatus_idx" ON "PartnerPhysicalRoom"("roomTypeId", "operationalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPhysicalRoom_propertyId_roomNumber_key" ON "PartnerPhysicalRoom"("propertyId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRatePlan_ratePlanId_key" ON "PartnerRatePlan"("ratePlanId");

-- CreateIndex
CREATE INDEX "PartnerRatePlan_roomId_status_idx" ON "PartnerRatePlan"("roomId", "status");

-- CreateIndex
CREATE INDEX "PartnerRatePlanInventoryDay_stayDate_idx" ON "PartnerRatePlanInventoryDay"("stayDate");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRatePlanInventoryDay_ratePlanId_stayDate_key" ON "PartnerRatePlanInventoryDay"("ratePlanId", "stayDate");

-- CreateIndex
CREATE UNIQUE INDEX "HotelReview_bookingId_key" ON "HotelReview"("bookingId");

-- CreateIndex
CREATE INDEX "HotelReview_hotelSlug_status_createdAt_idx" ON "HotelReview"("hotelSlug", "status", "createdAt");

-- CreateIndex
CREATE INDEX "HotelReview_userId_createdAt_idx" ON "HotelReview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "HotelReview_moderatedByUserId_idx" ON "HotelReview"("moderatedByUserId");

-- CreateIndex
CREATE INDEX "BookingAmendment_bookingId_status_createdAt_idx" ON "BookingAmendment"("bookingId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingGuest_bookingId_key" ON "BookingGuest"("bookingId");

-- CreateIndex
CREATE INDEX "BookingGuest_email_idx" ON "BookingGuest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_bookingId_key" ON "PaymentTransaction"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_providerRef_key" ON "PaymentTransaction"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_checkoutIntentId_key" ON "PaymentTransaction"("checkoutIntentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_reconciliationStatus_createdAt_idx" ON "PaymentTransaction"("reconciliationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_providerRefundRef_key" ON "RefundRequest"("providerRefundRef");

-- CreateIndex
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RefundRequest_bookingId_createdAt_idx" ON "RefundRequest"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "RefundRequest_paymentId_createdAt_idx" ON "RefundRequest"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_entryType_createdAt_idx" ON "FinancialLedgerEntry"("entryType", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_paymentId_createdAt_idx" ON "FinancialLedgerEntry"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_refundId_createdAt_idx" ON "FinancialLedgerEntry"("refundId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAllocation_partnerId_allocationType_createdAt_idx" ON "PaymentAllocation"("partnerId", "allocationType", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_status_idx" ON "PaymentAllocation"("paymentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_allocationKey_key" ON "PaymentAllocation"("paymentId", "allocationKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJournal_reference_key" ON "FinancialJournal"("reference");

-- CreateIndex
CREATE INDEX "FinancialJournal_paymentId_createdAt_idx" ON "FinancialJournal"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialJournal_refundId_createdAt_idx" ON "FinancialJournal"("refundId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialJournal_status_createdAt_idx" ON "FinancialJournal"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJournal_sourceType_sourceId_key" ON "FinancialJournal"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinancialJournalPosting_journalId_direction_idx" ON "FinancialJournalPosting"("journalId", "direction");

-- CreateIndex
CREATE INDEX "FinancialJournalPosting_accountCode_createdAt_idx" ON "FinancialJournalPosting"("accountCode", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialJournalPosting_partnerId_accountCode_createdAt_idx" ON "FinancialJournalPosting"("partnerId", "accountCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSettlementLine_bookingId_key" ON "PartnerSettlementLine"("bookingId");

-- CreateIndex
CREATE INDEX "PartnerSettlementLine_settlementId_createdAt_idx" ON "PartnerSettlementLine"("settlementId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerSettlementLine_partnerId_eligibleAt_idx" ON "PartnerSettlementLine"("partnerId", "eligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSettlementLine_sourceType_sourceId_key" ON "PartnerSettlementLine"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayoutAccount_providerBeneficiaryRef_key" ON "PartnerPayoutAccount"("providerBeneficiaryRef");

-- CreateIndex
CREATE INDEX "PartnerPayoutAccount_partnerId_status_isDefault_idx" ON "PartnerPayoutAccount"("partnerId", "status", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayoutBatch_idempotencyKey_key" ON "PartnerPayoutBatch"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayoutBatch_providerBatchRef_key" ON "PartnerPayoutBatch"("providerBatchRef");

-- CreateIndex
CREATE INDEX "PartnerPayoutBatch_status_createdAt_idx" ON "PartnerPayoutBatch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayoutInstruction_settlementId_key" ON "PartnerPayoutInstruction"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayoutInstruction_providerPayoutRef_key" ON "PartnerPayoutInstruction"("providerPayoutRef");

-- CreateIndex
CREATE INDEX "PartnerPayoutInstruction_batchId_status_idx" ON "PartnerPayoutInstruction"("batchId", "status");

-- CreateIndex
CREATE INDEX "PartnerPayoutInstruction_partnerId_status_createdAt_idx" ON "PartnerPayoutInstruction"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionCampaign_code_key" ON "PromotionCampaign"("code");

-- CreateIndex
CREATE INDEX "PromotionCampaign_active_startsAt_endsAt_idx" ON "PromotionCampaign"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PromotionCampaign_updatedAt_idx" ON "PromotionCampaign"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_checkoutIntentId_key" ON "PromotionRedemption"("checkoutIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_bookingId_key" ON "PromotionRedemption"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_customerTripId_key" ON "PromotionRedemption"("customerTripId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_claimKey_key" ON "PromotionRedemption"("claimKey");

-- CreateIndex
CREATE INDEX "PromotionRedemption_campaignId_status_expiresAt_idx" ON "PromotionRedemption"("campaignId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "PromotionRedemption_userId_campaignId_status_idx" ON "PromotionRedemption"("userId", "campaignId", "status");

-- CreateIndex
CREATE INDEX "PromotionRedemption_status_expiresAt_idx" ON "PromotionRedemption"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PromotionCampaignEvent_campaignId_createdAt_idx" ON "PromotionCampaignEvent"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionCampaignEvent_actorUserId_createdAt_idx" ON "PromotionCampaignEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionCampaignEvent_createdAt_idx" ON "PromotionCampaignEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RoomInventoryOverride_roomTypeId_stayDate_idx" ON "RoomInventoryOverride"("roomTypeId", "stayDate");

-- CreateIndex
CREATE UNIQUE INDEX "RoomInventoryOverride_roomTypeId_stayDate_key" ON "RoomInventoryOverride"("roomTypeId", "stayDate");

-- CreateIndex
CREATE INDEX "PlatformFeatureFlag_enabled_updatedAt_idx" ON "PlatformFeatureFlag"("enabled", "updatedAt");

-- CreateIndex
CREATE INDEX "PlatformFeatureFlagEvent_flagKey_createdAt_idx" ON "PlatformFeatureFlagEvent"("flagKey", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformFeatureFlagEvent_createdAt_idx" ON "PlatformFeatureFlagEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationContent_slug_key" ON "DestinationContent"("slug");

-- CreateIndex
CREATE INDEX "DestinationContent_status_updatedAt_idx" ON "DestinationContent"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "DestinationContent_state_status_name_idx" ON "DestinationContent"("state", "status", "name");

-- CreateIndex
CREATE INDEX "DestinationContentEvent_destinationId_createdAt_idx" ON "DestinationContentEvent"("destinationId", "createdAt");

-- CreateIndex
CREATE INDEX "DestinationContentEvent_createdAt_idx" ON "DestinationContentEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PartnerPayoutAccountEvent_payoutAccountId_createdAt_idx" ON "PartnerPayoutAccountEvent"("payoutAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerPayoutAccountEvent_actorUserId_createdAt_idx" ON "PartnerPayoutAccountEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayoutAccountEvent_payoutAccountId_version_key" ON "PartnerPayoutAccountEvent"("payoutAccountId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerTaxProfile_partnerId_key" ON "PartnerTaxProfile"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerTaxProfile_reviewStatus_gstRegistrationStatus_update_idx" ON "PartnerTaxProfile"("reviewStatus", "gstRegistrationStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactInquiry_reference_key" ON "ContactInquiry"("reference");

-- CreateIndex
CREATE INDEX "ContactInquiry_status_createdAt_idx" ON "ContactInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_email_createdAt_idx" ON "ContactInquiry"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_status_consentAt_idx" ON "NewsletterSubscription"("status", "consentAt");

-- AddForeignKey
ALTER TABLE "UserAccessEvent" ADD CONSTRAINT "UserAccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessEvent" ADD CONSTRAINT "UserAccessEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTraveler" ADD CONSTRAINT "SavedTraveler_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsentRecord" ADD CONSTRAINT "UserConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPrivacyRequest" ADD CONSTRAINT "DataPrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPrivacyRequest" ADD CONSTRAINT "DataPrivacyRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPrivacyRequestEvent" ADD CONSTRAINT "DataPrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataPrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPrivacyRequestEvent" ADD CONSTRAINT "DataPrivacyRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMfaCredential" ADD CONSTRAINT "UserMfaCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMfaRecoveryCode" ADD CONSTRAINT "UserMfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMfaRecoveryCode" ADD CONSTRAINT "UserMfaRecoveryCode_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "UserMfaCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyPartnerMember" ADD CONSTRAINT "SupplyPartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyPartnerMember" ADD CONSTRAINT "SupplyPartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProperty" ADD CONSTRAINT "PartnerProperty_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSupplierConnection" ADD CONSTRAINT "FlightSupplierConnection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSupplierOperation" ADD CONSTRAINT "FlightSupplierOperation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FlightSupplierConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusRoute" ADD CONSTRAINT "PartnerBusRoute_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusTrip" ADD CONSTRAINT "PartnerBusTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "PartnerBusRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusSeatHold" ADD CONSTRAINT "PartnerBusSeatHold_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "PartnerBusTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusSeatHold" ADD CONSTRAINT "PartnerBusSeatHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusSeatHoldSeat" ADD CONSTRAINT "PartnerBusSeatHoldSeat_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "PartnerBusSeatHold"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusSeatHoldSeat" ADD CONSTRAINT "PartnerBusSeatHoldSeat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "PartnerBusTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusReservation" ADD CONSTRAINT "PartnerBusReservation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusReservation" ADD CONSTRAINT "PartnerBusReservation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "PartnerBusTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBusReservation" ADD CONSTRAINT "PartnerBusReservation_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRoomType" ADD CONSTRAINT "PartnerRoomType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerApplication" ADD CONSTRAINT "PartnerApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerApplication" ADD CONSTRAINT "PartnerApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerApplication" ADD CONSTRAINT "PartnerApplication_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocument" ADD CONSTRAINT "PartnerKycDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocument" ADD CONSTRAINT "PartnerKycDocument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocument" ADD CONSTRAINT "PartnerKycDocument_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocumentVersion" ADD CONSTRAINT "PartnerKycDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PartnerKycDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocumentVersion" ADD CONSTRAINT "PartnerKycDocumentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PartnerKycDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerHotelInventoryDay" ADD CONSTRAINT "PartnerHotelInventoryDay_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerVehicle" ADD CONSTRAINT "PartnerVehicle_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOtpChallenge" ADD CONSTRAINT "EmailOtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementVersion" ADD CONSTRAINT "PartnerAgreementVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementVersionEvent" ADD CONSTRAINT "PartnerAgreementVersionEvent_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementVersionEvent" ADD CONSTRAINT "PartnerAgreementVersionEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementRelease" ADD CONSTRAINT "PartnerAgreementRelease_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementRelease" ADD CONSTRAINT "PartnerAgreementRelease_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPhoneVerification" ADD CONSTRAINT "PartnerPhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementAcceptance" ADD CONSTRAINT "PartnerAgreementAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementAcceptance" ADD CONSTRAINT "PartnerAgreementAcceptance_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "PartnerAgreementVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreementAcceptance" ADD CONSTRAINT "PartnerAgreementAcceptance_phoneVerificationId_fkey" FOREIGN KEY ("phoneVerificationId") REFERENCES "PartnerPhoneVerification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboardingCoupon" ADD CONSTRAINT "PartnerOnboardingCoupon_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboardingCouponEvent" ADD CONSTRAINT "PartnerOnboardingCouponEvent_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "PartnerOnboardingCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboardingCouponEvent" ADD CONSTRAINT "PartnerOnboardingCouponEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboardingOrder" ADD CONSTRAINT "PartnerOnboardingOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboardingOrder" ADD CONSTRAINT "PartnerOnboardingOrder_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "PartnerOnboardingCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerOnboardingOrder" ADD CONSTRAINT "PartnerOnboardingOrder_agreementAcceptanceId_fkey" FOREIGN KEY ("agreementAcceptanceId") REFERENCES "PartnerAgreementAcceptance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerVehicleInventoryDay" ADD CONSTRAINT "PartnerVehicleInventoryDay_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "PartnerVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerVehicleReservation" ADD CONSTRAINT "PartnerVehicleReservation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerVehicleReservation" ADD CONSTRAINT "PartnerVehicleReservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "PartnerVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerVehicleReservation" ADD CONSTRAINT "PartnerVehicleReservation_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAuditLog" ADD CONSTRAINT "PartnerAuditLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAuditLog" ADD CONSTRAINT "PartnerAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSecurityEvent" ADD CONSTRAINT "AccountSecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyCustomer" ADD CONSTRAINT "AgencyCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyCustomerTravelRequest" ADD CONSTRAINT "AgencyCustomerTravelRequest_businessTravelRequestId_fkey" FOREIGN KEY ("businessTravelRequestId") REFERENCES "BusinessTravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyCustomerTravelRequest" ADD CONSTRAINT "AgencyCustomerTravelRequest_agencyCustomerId_fkey" FOREIGN KEY ("agencyCustomerId") REFERENCES "AgencyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSupportCase" ADD CONSTRAINT "BusinessSupportCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSupportCase" ADD CONSTRAINT "BusinessSupportCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSupportCase" ADD CONSTRAINT "CustomerSupportCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSupportCase" ADD CONSTRAINT "CustomerSupportCase_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSupportCase" ADD CONSTRAINT "CustomerSupportCase_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSupportCase" ADD CONSTRAINT "CustomerSupportCase_hotelBookingId_fkey" FOREIGN KEY ("hotelBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSupportCaseEvent" ADD CONSTRAINT "CustomerSupportCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CustomerSupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSupportCaseEvent" ADD CONSTRAINT "CustomerSupportCaseEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPolicyVersion" ADD CONSTRAINT "OrganizationPolicyVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPolicyVersion" ADD CONSTRAINT "OrganizationPolicyVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAuditLog" ADD CONSTRAINT "BusinessAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAuditLog" ADD CONSTRAINT "BusinessAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTravelRequest" ADD CONSTRAINT "BusinessTravelRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTravelRequest" ADD CONSTRAINT "BusinessTravelRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTravelRequest" ADD CONSTRAINT "BusinessTravelRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTravelRequest" ADD CONSTRAINT "BusinessTravelRequest_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "OrganizationPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTrip" ADD CONSTRAINT "CustomerTrip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTrip" ADD CONSTRAINT "CustomerTrip_businessTravelRequestId_fkey" FOREIGN KEY ("businessTravelRequestId") REFERENCES "BusinessTravelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAdvisory" ADD CONSTRAINT "ServiceAdvisory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAdvisoryEvent" ADD CONSTRAINT "ServiceAdvisoryEvent_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "ServiceAdvisory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAdvisoryEvent" ADD CONSTRAINT "ServiceAdvisoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelQuote" ADD CONSTRAINT "HotelQuote_availabilityLockId_fkey" FOREIGN KEY ("availabilityLockId") REFERENCES "AvailabilityLock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCheckoutIntent" ADD CONSTRAINT "PaymentCheckoutIntent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "HotelQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyLedger" ADD CONSTRAINT "LoyaltyLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceComponent" ADD CONSTRAINT "PriceComponent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "HotelQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "HotelQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_availabilityLockId_fkey" FOREIGN KEY ("availabilityLockId") REFERENCES "AvailabilityLock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_businessTravelRequestId_fkey" FOREIGN KEY ("businessTravelRequestId") REFERENCES "BusinessTravelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTaxSnapshot" ADD CONSTRAINT "MarketplaceTaxSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTaxSnapshot" ADD CONSTRAINT "MarketplaceTaxSnapshot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerVehicleMaintenance" ADD CONSTRAINT "PartnerVehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "PartnerVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationOutboxEvent" ADD CONSTRAINT "IntegrationOutboxEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationOutboxReviewEvent" ADD CONSTRAINT "IntegrationOutboxReviewEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IntegrationOutboxEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationOutboxReviewEvent" ADD CONSTRAINT "IntegrationOutboxReviewEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelChannelConnection" ADD CONSTRAINT "HotelChannelConnection_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelChannelPropertyMapping" ADD CONSTRAINT "HotelChannelPropertyMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "HotelChannelConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelChannelPropertyMapping" ADD CONSTRAINT "HotelChannelPropertyMapping_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelChannelSyncRun" ADD CONSTRAINT "HotelChannelSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "HotelChannelConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementEvent" ADD CONSTRAINT "PartnerSettlementEvent_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementEvent" ADD CONSTRAINT "PartnerSettlementEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchProjectionRebuildEvent" ADD CONSTRAINT "SearchProjectionRebuildEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPhysicalRoom" ADD CONSTRAINT "PartnerPhysicalRoom_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PartnerProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPhysicalRoom" ADD CONSTRAINT "PartnerPhysicalRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "PartnerRoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRatePlan" ADD CONSTRAINT "PartnerRatePlan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PartnerRoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRatePlanInventoryDay" ADD CONSTRAINT "PartnerRatePlanInventoryDay_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "PartnerRatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAmendment" ADD CONSTRAINT "BookingAmendment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGuest" ADD CONSTRAINT "BookingGuest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_checkoutIntentId_fkey" FOREIGN KEY ("checkoutIntentId") REFERENCES "PaymentCheckoutIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "RefundRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialJournal" ADD CONSTRAINT "FinancialJournal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialJournal" ADD CONSTRAINT "FinancialJournal_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "RefundRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialJournalPosting" ADD CONSTRAINT "FinancialJournalPosting_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "FinancialJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementLine" ADD CONSTRAINT "PartnerSettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementLine" ADD CONSTRAINT "PartnerSettlementLine_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSettlementLine" ADD CONSTRAINT "PartnerSettlementLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutAccount" ADD CONSTRAINT "PartnerPayoutAccount_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutAccount" ADD CONSTRAINT "PartnerPayoutAccount_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutInstruction" ADD CONSTRAINT "PartnerPayoutInstruction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PartnerPayoutBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutInstruction" ADD CONSTRAINT "PartnerPayoutInstruction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "PartnerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutInstruction" ADD CONSTRAINT "PartnerPayoutInstruction_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "PartnerPayoutAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutInstruction" ADD CONSTRAINT "PartnerPayoutInstruction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_checkoutIntentId_fkey" FOREIGN KEY ("checkoutIntentId") REFERENCES "PaymentCheckoutIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_customerTripId_fkey" FOREIGN KEY ("customerTripId") REFERENCES "CustomerTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCampaignEvent" ADD CONSTRAINT "PromotionCampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCampaignEvent" ADD CONSTRAINT "PromotionCampaignEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeatureFlag" ADD CONSTRAINT "PlatformFeatureFlag_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeatureFlagEvent" ADD CONSTRAINT "PlatformFeatureFlagEvent_flagKey_fkey" FOREIGN KEY ("flagKey") REFERENCES "PlatformFeatureFlag"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeatureFlagEvent" ADD CONSTRAINT "PlatformFeatureFlagEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationContent" ADD CONSTRAINT "DestinationContent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationContent" ADD CONSTRAINT "DestinationContent_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationContentEvent" ADD CONSTRAINT "DestinationContentEvent_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "DestinationContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationContentEvent" ADD CONSTRAINT "DestinationContentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutAccountEvent" ADD CONSTRAINT "PartnerPayoutAccountEvent_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "PartnerPayoutAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayoutAccountEvent" ADD CONSTRAINT "PartnerPayoutAccountEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerTaxProfile" ADD CONSTRAINT "PartnerTaxProfile_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
