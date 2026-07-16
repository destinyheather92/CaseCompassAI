-- AlterEnum
BEGIN;
CREATE TYPE "IntakeStatus_new" AS ENUM ('DRAFT', 'INTERVIEWING', 'NEEDS_CLARIFICATION', 'READY_FOR_REVIEW', 'COMPLETED', 'ABANDONED');
ALTER TABLE "public"."IntakeSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "IntakeSession" ALTER COLUMN "status" TYPE "IntakeStatus_new" USING ("status"::text::"IntakeStatus_new");
ALTER TYPE "IntakeStatus" RENAME TO "IntakeStatus_old";
ALTER TYPE "IntakeStatus_new" RENAME TO "IntakeStatus";
DROP TYPE "public"."IntakeStatus_old";
ALTER TABLE "IntakeSession" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "IntakeSession" DROP COLUMN "description",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "factualSummary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "proceduralStage" TEXT NOT NULL,
ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topicsCovered" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "unresolvedInformation" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "IntakeAnswer" (
    "id" TEXT NOT NULL,
    "intakeSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "answerType" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeAnswer_intakeSessionId_idx" ON "IntakeAnswer"("intakeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeAnswer_intakeSessionId_sequence_key" ON "IntakeAnswer"("intakeSessionId", "sequence");

-- CreateIndex
CREATE INDEX "IntakeSession_facilityId_idx" ON "IntakeSession"("facilityId");

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

