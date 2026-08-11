ALTER TABLE "Organization" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactPhone" TEXT;

UPDATE "Organization"
SET "contactEmail" = (
    SELECT "User"."email"
    FROM "OrganizationMember"
    INNER JOIN "User" ON "User"."id" = "OrganizationMember"."userId"
    WHERE "OrganizationMember"."organizationId" = "Organization"."id"
      AND "OrganizationMember"."role" = 'ADMIN'
    ORDER BY "OrganizationMember"."createdAt" ASC
    LIMIT 1
);
