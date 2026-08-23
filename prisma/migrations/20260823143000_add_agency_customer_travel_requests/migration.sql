CREATE TABLE "AgencyCustomerTravelRequest" (
  "businessTravelRequestId" TEXT NOT NULL PRIMARY KEY,
  "agencyCustomerId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgencyCustomerTravelRequest_businessTravelRequestId_fkey"
    FOREIGN KEY ("businessTravelRequestId") REFERENCES "BusinessTravelRequest" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgencyCustomerTravelRequest_agencyCustomerId_fkey"
    FOREIGN KEY ("agencyCustomerId") REFERENCES "AgencyCustomer" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AgencyCustomerTravelRequest_agencyCustomerId_createdAt_idx"
  ON "AgencyCustomerTravelRequest"("agencyCustomerId", "createdAt");
