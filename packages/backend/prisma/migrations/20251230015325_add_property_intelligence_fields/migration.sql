-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "engagementReasoning" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "inquiryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "listingDate" TIMESTAMP(3),
ADD COLUMN     "rateableValue" INTEGER,
ADD COLUMN     "viewingCount" INTEGER NOT NULL DEFAULT 0;
