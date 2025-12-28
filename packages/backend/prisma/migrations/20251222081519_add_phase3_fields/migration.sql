-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "conjunctionalAgencyName" TEXT,
ADD COLUMN     "conjunctionalSplit" DOUBLE PRECISION,
ADD COLUMN     "isListingAgent" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "NurtureSequence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "nextTouchDate" TIMESTAMP(3) NOT NULL,
    "lastTouchAt" TIMESTAMP(3),
    "touchCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NurtureSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NurtureSequence_userId_status_idx" ON "NurtureSequence"("userId", "status");

-- CreateIndex
CREATE INDEX "NurtureSequence_nextTouchDate_idx" ON "NurtureSequence"("nextTouchDate");

-- CreateIndex
CREATE INDEX "NurtureSequence_dealId_idx" ON "NurtureSequence"("dealId");

-- AddForeignKey
ALTER TABLE "NurtureSequence" ADD CONSTRAINT "NurtureSequence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurtureSequence" ADD CONSTRAINT "NurtureSequence_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurtureSequence" ADD CONSTRAINT "NurtureSequence_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
