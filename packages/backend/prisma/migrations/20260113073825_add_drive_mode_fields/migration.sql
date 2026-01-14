-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Export" ADD COLUMN     "content" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "floorSize" TEXT,
ADD COLUMN     "inferredFromWeb" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCrmExportAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "context" TEXT,
ADD COLUMN     "estimatedDuration" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "crmEmails" JSONB,
ADD COLUMN     "crmType" TEXT;

-- CreateTable
CREATE TABLE "AppointmentParticipant" (
    "id" TEXT NOT NULL,
    "timelineEventId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "communicationChannel" TEXT,

    CONSTRAINT "AppointmentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSyncLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "crmTarget" TEXT NOT NULL,
    "syncMethod" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" TEXT NOT NULL,
    "emailMessageId" TEXT,

    CONSTRAINT "CrmSyncLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentParticipant_timelineEventId_idx" ON "AppointmentParticipant"("timelineEventId");

-- CreateIndex
CREATE INDEX "AppointmentParticipant_contactId_idx" ON "AppointmentParticipant"("contactId");

-- CreateIndex
CREATE INDEX "CrmSyncLedger_userId_entityType_idx" ON "CrmSyncLedger"("userId", "entityType");

-- CreateIndex
CREATE INDEX "CrmSyncLedger_userId_syncedAt_idx" ON "CrmSyncLedger"("userId", "syncedAt");

-- AddForeignKey
ALTER TABLE "AppointmentParticipant" ADD CONSTRAINT "AppointmentParticipant_timelineEventId_fkey" FOREIGN KEY ("timelineEventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentParticipant" ADD CONSTRAINT "AppointmentParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSyncLedger" ADD CONSTRAINT "CrmSyncLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
