-- CreateTable
CREATE TABLE "ContactPrediction" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maturityLevel" INTEGER NOT NULL DEFAULT 0,
    "emailsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "oldestDataAt" TIMESTAMP(3),
    "personalityType" TEXT,
    "personalityConfidence" DOUBLE PRECISION,
    "detectedMarkers" JSONB,
    "communicationTips" JSONB,
    "sellProbability" DOUBLE PRECISION,
    "sellConfidence" DOUBLE PRECISION,
    "sellSignals" JSONB,
    "buyProbability" DOUBLE PRECISION,
    "buyConfidence" DOUBLE PRECISION,
    "buySignals" JSONB,
    "churnRisk" DOUBLE PRECISION,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutonomousAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "actionType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "draftSubject" TEXT,
    "draftBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mode" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "executionResult" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "AutonomousAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactPrediction_contactId_key" ON "ContactPrediction"("contactId");

-- CreateIndex
CREATE INDEX "ContactPrediction_userId_idx" ON "ContactPrediction"("userId");

-- CreateIndex
CREATE INDEX "ContactPrediction_maturityLevel_idx" ON "ContactPrediction"("maturityLevel");

-- CreateIndex
CREATE INDEX "ContactPrediction_personalityType_idx" ON "ContactPrediction"("personalityType");

-- CreateIndex
CREATE INDEX "AutonomousAction_userId_status_idx" ON "AutonomousAction"("userId", "status");

-- CreateIndex
CREATE INDEX "AutonomousAction_scheduledFor_idx" ON "AutonomousAction"("scheduledFor");

-- CreateIndex
CREATE INDEX "AutonomousAction_priority_idx" ON "AutonomousAction"("priority");

-- CreateIndex
CREATE INDEX "AutonomousAction_actionType_idx" ON "AutonomousAction"("actionType");

-- AddForeignKey
ALTER TABLE "ContactPrediction" ADD CONSTRAINT "ContactPrediction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutonomousAction" ADD CONSTRAINT "AutonomousAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutonomousAction" ADD CONSTRAINT "AutonomousAction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
