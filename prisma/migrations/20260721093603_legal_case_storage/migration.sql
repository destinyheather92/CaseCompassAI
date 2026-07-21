-- CreateEnum
CREATE TYPE "LegalCaseProvider" AS ENUM ('COURTLISTENER', 'VLEX', 'FASTCASE', 'WESTLAW', 'LEXIS');

-- CreateEnum
CREATE TYPE "LegalCaseVerificationStatus" AS ENUM ('VERIFIED', 'POSSIBLE_MATCH', 'NOT_VERIFIED', 'SOURCE_UNAVAILABLE');

-- CreateTable
CREATE TABLE "LegalCaseRecord" (
    "id" TEXT NOT NULL,
    "provider" "LegalCaseProvider" NOT NULL,
    "providerCaseId" TEXT NOT NULL,
    "clusterId" TEXT,
    "caseName" TEXT NOT NULL,
    "citation" TEXT,
    "citations" JSONB NOT NULL,
    "courtName" TEXT,
    "courtId" TEXT,
    "jurisdiction" TEXT,
    "docketNumber" TEXT,
    "decisionDate" TIMESTAMP(3),
    "opinionText" TEXT,
    "sourceUrl" TEXT,
    "verificationStatus" "LegalCaseVerificationStatus" NOT NULL,
    "verificationMethod" TEXT,
    "originalCollection" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawSourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalCaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseExplanationRecord" (
    "id" TEXT NOT NULL,
    "legalCaseId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "sourceTextHash" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyFacts" JSONB NOT NULL,
    "legalIssues" JSONB NOT NULL,
    "holding" TEXT NOT NULL,
    "courtsReasoning" TEXT NOT NULL,
    "ruleOfLaw" TEXT NOT NULL,
    "whyThisCaseMatters" TEXT NOT NULL,
    "howItMightRelate" TEXT NOT NULL,
    "importantQuotes" JSONB NOT NULL,
    "keyTerms" JSONB NOT NULL,
    "basedOnFullOpinionText" BOOLEAN NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseExplanationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalCaseRecord_citation_idx" ON "LegalCaseRecord"("citation");

-- CreateIndex
CREATE UNIQUE INDEX "LegalCaseRecord_provider_providerCaseId_key" ON "LegalCaseRecord"("provider", "providerCaseId");

-- CreateIndex
CREATE INDEX "CaseExplanationRecord_legalCaseId_idx" ON "CaseExplanationRecord"("legalCaseId");

-- CreateIndex
CREATE INDEX "CaseExplanationRecord_sourceTextHash_idx" ON "CaseExplanationRecord"("sourceTextHash");

-- AddForeignKey
ALTER TABLE "CaseExplanationRecord" ADD CONSTRAINT "CaseExplanationRecord_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "LegalCaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

