-- CreateEnum
CREATE TYPE "ZenaCategory" AS ENUM ('PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "categorizedAt" TIMESTAMP(3),
ADD COLUMN     "categoryConfidence" DOUBLE PRECISION,
ADD COLUMN     "zenaCategory" "ZenaCategory" NOT NULL DEFAULT 'PULSE',
ADD COLUMN     "zenaIntelligence" JSONB;
