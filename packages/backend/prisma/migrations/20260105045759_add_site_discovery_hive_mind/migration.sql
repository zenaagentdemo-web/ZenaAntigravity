-- AlterTable
ALTER TABLE "AutonomousAction" ADD COLUMN     "assets" JSONB,
ADD COLUMN     "contextSummary" TEXT,
ADD COLUMN     "intelligenceSources" JSONB,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "propertyId" TEXT,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "script" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullGodEnd" TIMESTAMP(3),
ADD COLUMN     "fullGodStart" TIMESTAMP(3),
ADD COLUMN     "lastGodmodeScanAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PropertyPrediction" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "momentumScore" INTEGER NOT NULL DEFAULT 0,
    "buyerInterestLevel" TEXT NOT NULL DEFAULT 'Medium',
    "reasoning" TEXT,
    "predictedSaleDate" TIMESTAMP(3),
    "marketValueEstimate" DECIMAL(12,2),
    "confidenceScore" DOUBLE PRECISION,
    "suggestedActions" JSONB,
    "milestoneForecasts" JSONB,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "source" TEXT NOT NULL,
    "endpoint" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteKnowledge" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "displayName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'portal',
    "discoveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "discoveryProgress" INTEGER NOT NULL DEFAULT 0,
    "lastDiscoveredAt" TIMESTAMP(3),
    "discoveryError" TEXT,
    "uiMap" JSONB,
    "screenshotRefs" TEXT[],
    "loginUrl" TEXT,
    "mainUrl" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnedActionPath" (
    "id" TEXT NOT NULL,
    "siteKnowledgeId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "intentPattern" TEXT,
    "steps" JSONB NOT NULL,
    "extractionRules" JSONB,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "averageDuration" INTEGER,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deprecatedAt" TIMESTAMP(3),
    "deprecationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnedActionPath_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPrediction_propertyId_key" ON "PropertyPrediction"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyPrediction_propertyId_idx" ON "PropertyPrediction"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyPrediction_buyerInterestLevel_idx" ON "PropertyPrediction"("buyerInterestLevel");

-- CreateIndex
CREATE INDEX "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AIUsageLog_source_idx" ON "AIUsageLog"("source");

-- CreateIndex
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteKnowledge_domain_key" ON "SiteKnowledge"("domain");

-- CreateIndex
CREATE INDEX "SiteKnowledge_domain_idx" ON "SiteKnowledge"("domain");

-- CreateIndex
CREATE INDEX "SiteKnowledge_discoveryStatus_idx" ON "SiteKnowledge"("discoveryStatus");

-- CreateIndex
CREATE INDEX "SiteKnowledge_category_idx" ON "SiteKnowledge"("category");

-- CreateIndex
CREATE INDEX "LearnedActionPath_siteKnowledgeId_idx" ON "LearnedActionPath"("siteKnowledgeId");

-- CreateIndex
CREATE INDEX "LearnedActionPath_taskType_idx" ON "LearnedActionPath"("taskType");

-- CreateIndex
CREATE INDEX "LearnedActionPath_isActive_idx" ON "LearnedActionPath"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LearnedActionPath_siteKnowledgeId_taskType_version_key" ON "LearnedActionPath"("siteKnowledgeId", "taskType", "version");

-- CreateIndex
CREATE INDEX "AutonomousAction_propertyId_idx" ON "AutonomousAction"("propertyId");

-- AddForeignKey
ALTER TABLE "AutonomousAction" ADD CONSTRAINT "AutonomousAction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPrediction" ADD CONSTRAINT "PropertyPrediction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnedActionPath" ADD CONSTRAINT "LearnedActionPath_siteKnowledgeId_fkey" FOREIGN KEY ("siteKnowledgeId") REFERENCES "SiteKnowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
