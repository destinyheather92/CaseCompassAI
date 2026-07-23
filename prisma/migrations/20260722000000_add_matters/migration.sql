-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "IntakeSession" ADD COLUMN     "matterId" TEXT;

-- AlterTable
ALTER TABLE "ResearchRoadmap" ADD COLUMN     "matterId" TEXT;

-- AlterTable
ALTER TABLE "SavedCase" ADD COLUMN     "matterId" TEXT;

-- AlterTable
ALTER TABLE "SavedResource" ADD COLUMN     "matterId" TEXT;

-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseNumber" TEXT,
    "court" TEXT,
    "jurisdiction" TEXT,
    "matterType" TEXT,
    "status" "MatterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Matter_userId_idx" ON "Matter"("userId");

-- CreateIndex
CREATE INDEX "Matter_status_idx" ON "Matter"("status");

-- CreateIndex
CREATE INDEX "ResearchRoadmap_matterId_idx" ON "ResearchRoadmap"("matterId");

-- CreateIndex
CREATE INDEX "SavedCase_matterId_idx" ON "SavedCase"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCase_matterId_providerName_providerCaseId_key" ON "SavedCase"("matterId", "providerName", "providerCaseId");

-- CreateIndex
CREATE INDEX "SavedResource_matterId_idx" ON "SavedResource"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedResource_matterId_resourceType_resourceKey_key" ON "SavedResource"("matterId", "resourceType", "resourceKey");

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSession" ADD CONSTRAINT "IntakeSession_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRoadmap" ADD CONSTRAINT "ResearchRoadmap_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedResource" ADD CONSTRAINT "SavedResource_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

