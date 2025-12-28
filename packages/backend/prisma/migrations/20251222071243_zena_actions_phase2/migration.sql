-- AlterTable
ALTER TABLE "NotificationPreferences" ADD COLUMN     "dealDeadlines" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "morningBriefing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "settlementCountdown" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "staleDealAlerts" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ZenaAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "output" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "ZenaAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZenaAction_userId_idx" ON "ZenaAction"("userId");

-- CreateIndex
CREATE INDEX "ZenaAction_dealId_idx" ON "ZenaAction"("dealId");

-- CreateIndex
CREATE INDEX "ZenaAction_status_idx" ON "ZenaAction"("status");

-- CreateIndex
CREATE INDEX "ZenaAction_type_idx" ON "ZenaAction"("type");

-- AddForeignKey
ALTER TABLE "ZenaAction" ADD CONSTRAINT "ZenaAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZenaAction" ADD CONSTRAINT "ZenaAction_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
