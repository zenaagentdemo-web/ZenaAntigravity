-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "auctionDate" TIMESTAMP(3),
ADD COLUMN     "commissionFormulaId" TEXT,
ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "conjunctionalAgencyId" TEXT,
ADD COLUMN     "dealValue" DECIMAL(12,2),
ADD COLUMN     "estimatedCommission" DECIMAL(10,2),
ADD COLUMN     "goLiveDate" TIMESTAMP(3),
ADD COLUMN     "isConjunctional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "pipelineType" TEXT NOT NULL DEFAULT 'buyer',
ADD COLUMN     "saleMethod" TEXT NOT NULL DEFAULT 'negotiation',
ADD COLUMN     "settlementDate" TIMESTAMP(3),
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenderCloseDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionFormula" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tiers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionFormula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "CommissionFormula_userId_idx" ON "CommissionFormula"("userId");

-- CreateIndex
CREATE INDEX "CommissionFormula_isDefault_idx" ON "CommissionFormula"("isDefault");

-- CreateIndex
CREATE INDEX "Deal_pipelineType_idx" ON "Deal"("pipelineType");

-- CreateIndex
CREATE INDEX "Deal_stageEnteredAt_idx" ON "Deal"("stageEnteredAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_commissionFormulaId_fkey" FOREIGN KEY ("commissionFormulaId") REFERENCES "CommissionFormula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionFormula" ADD CONSTRAINT "CommissionFormula_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
