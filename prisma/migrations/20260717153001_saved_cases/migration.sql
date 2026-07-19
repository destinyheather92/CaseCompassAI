-- AlterEnum
ALTER TYPE "UserActivityType" ADD VALUE 'CASE_SAVED';

-- CreateTable
CREATE TABLE "SavedCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT,
    "providerName" TEXT NOT NULL,
    "providerCaseId" TEXT NOT NULL,
    "caseName" TEXT NOT NULL,
    "citation" TEXT,
    "court" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "decisionDate" TIMESTAMP(3),
    "docketNumber" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "matchedTopic" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedCase_userId_createdAt_idx" ON "SavedCase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedCase_roadmapId_idx" ON "SavedCase"("roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCase_userId_providerName_providerCaseId_key" ON "SavedCase"("userId", "providerName", "providerCaseId");

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "ResearchRoadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
