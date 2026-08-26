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

CREATE UNIQUE INDEX "PartnerKycDocument_applicationId_documentType_key" ON "PartnerKycDocument"("applicationId", "documentType");
CREATE INDEX "PartnerKycDocument_applicationId_status_idx" ON "PartnerKycDocument"("applicationId", "status");
CREATE INDEX "PartnerKycDocument_partnerId_status_expiresOn_idx" ON "PartnerKycDocument"("partnerId", "status", "expiresOn");
CREATE UNIQUE INDEX "PartnerKycDocumentVersion_objectKey_key" ON "PartnerKycDocumentVersion"("objectKey");
CREATE UNIQUE INDEX "PartnerKycDocumentVersion_documentId_versionNumber_key" ON "PartnerKycDocumentVersion"("documentId", "versionNumber");
CREATE INDEX "PartnerKycDocumentVersion_documentId_createdAt_idx" ON "PartnerKycDocumentVersion"("documentId", "createdAt");
CREATE INDEX "PartnerKycDocumentVersion_storageStatus_uploadIntentExpiresAt_idx" ON "PartnerKycDocumentVersion"("storageStatus", "uploadIntentExpiresAt");
CREATE INDEX "PartnerKycDocumentEvent_documentId_createdAt_idx" ON "PartnerKycDocumentEvent"("documentId", "createdAt");
CREATE INDEX "PartnerKycDocumentEvent_applicationId_createdAt_idx" ON "PartnerKycDocumentEvent"("applicationId", "createdAt");
CREATE INDEX "PartnerKycDocumentEvent_partnerId_createdAt_idx" ON "PartnerKycDocumentEvent"("partnerId", "createdAt");
ALTER TABLE "PartnerKycDocument" ADD CONSTRAINT "PartnerKycDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocument" ADD CONSTRAINT "PartnerKycDocument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocument" ADD CONSTRAINT "PartnerKycDocument_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocumentVersion" ADD CONSTRAINT "PartnerKycDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PartnerKycDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocumentVersion" ADD CONSTRAINT "PartnerKycDocumentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PartnerKycDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnerApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerKycDocumentEvent" ADD CONSTRAINT "PartnerKycDocumentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
