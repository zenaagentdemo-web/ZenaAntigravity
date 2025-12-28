-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "intelligenceSnippet" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityDetail" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "bathrooms" INTEGER,
ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "landSize" TEXT,
ADD COLUMN     "listingPrice" DECIMAL(12,2),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'residential';
