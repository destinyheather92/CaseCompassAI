-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('STATE_PRISON', 'FEDERAL_PRISON', 'COUNTY_JAIL', 'REENTRY_PROGRAM', 'LAW_LIBRARY', 'LEGAL_AID_PARTNER', 'EDUCATIONAL_PARTNER', 'OTHER');

-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'INSTITUTION_STAFF';

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactTitle" TEXT,
ADD COLUMN     "estimatedPopulation" INTEGER,
ADD COLUMN     "estimatedUsers" INTEGER,
ADD COLUMN     "institutionType" "InstitutionType",
ADD COLUMN     "institutionTypeOther" TEXT,
ADD COLUMN     "organizationName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "docNumber" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "housingUnit" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateIndex
CREATE INDEX "User_housingUnit_idx" ON "User"("housingUnit");
