import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userId = '285f391f-e55b-4c49-9778-f00f830b7b4a';
    const today = new Date('2026-01-13T00:00:00Z');
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
            userId,
            timestamp: { gte: start, lte: end }
        }
    });

    console.log('Timeline Events entityTypes:');
    timelineEvents.forEach(e => console.log(`  Event: ${e.summary} -> entityType: ${e.entityType}`));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
