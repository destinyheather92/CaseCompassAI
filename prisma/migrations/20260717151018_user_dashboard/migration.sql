-- CreateEnum
CREATE TYPE "RoadmapStepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SavedResourceType" AS ENUM ('RESOURCE', 'LEGAL_TERM', 'ROADMAP_STEP', 'SOURCE', 'NOTE');

-- CreateEnum
CREATE TYPE "UserActivityType" AS ENUM ('INTAKE_STARTED', 'INTAKE_ANSWER_UPDATED', 'INTAKE_REVIEW_OPENED', 'INTAKE_CONFIRMED', 'ROADMAP_GENERATED', 'ROADMAP_STEP_STARTED', 'ROADMAP_STEP_COMPLETED', 'RESOURCE_VIEWED', 'LEGAL_TERM_SEARCHED', 'NOTE_SAVED', 'RESOURCE_SAVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "RoadmapProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "RoadmapStepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "note" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedResource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" "SavedResourceType" NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "href" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapProgress_userId_roadmapId_idx" ON "RoadmapProgress"("userId", "roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapProgress_userId_roadmapId_stepId_key" ON "RoadmapProgress"("userId", "roadmapId", "stepId");

-- CreateIndex
CREATE INDEX "SavedResource_userId_createdAt_idx" ON "SavedResource"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedResource_userId_resourceType_resourceKey_key" ON "SavedResource"("userId", "resourceType", "resourceKey");

-- CreateIndex
CREATE INDEX "UserActivity_userId_createdAt_idx" ON "UserActivity"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoadmapProgress" ADD CONSTRAINT "RoadmapProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapProgress" ADD CONSTRAINT "RoadmapProgress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "ResearchRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedResource" ADD CONSTRAINT "SavedResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

