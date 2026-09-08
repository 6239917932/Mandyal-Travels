CREATE TABLE "PartnerMemberInvitation" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMemberInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerMemberInvitation_tokenHash_key" ON "PartnerMemberInvitation"("tokenHash");
CREATE INDEX "PartnerMemberInvitation_partnerId_status_createdAt_idx" ON "PartnerMemberInvitation"("partnerId", "status", "createdAt");
CREATE INDEX "PartnerMemberInvitation_email_status_expiresAt_idx" ON "PartnerMemberInvitation"("email", "status", "expiresAt");

ALTER TABLE "PartnerMemberInvitation" ADD CONSTRAINT "PartnerMemberInvitation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "SupplyPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerMemberInvitation" ADD CONSTRAINT "PartnerMemberInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerMemberInvitation" ADD CONSTRAINT "PartnerMemberInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
