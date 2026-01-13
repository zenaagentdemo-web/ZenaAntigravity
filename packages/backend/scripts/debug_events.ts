import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userId = '285f391f-e55b-4c49-9778-f00f830b7b4a';

    // Check TODAY's events
    const today = new Date('2026-01-13T00:00:00Z');
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    console.log(`Checking events for ${userId} between ${start.toISOString()} and ${end.toISOString()}`);

    const tasks = await prisma.task.findMany({
        where: {
            userId,
            dueDate: { gte: start, lte: end }
        }
    });

    const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
            userId,
            timestamp: { gte: start, lte: end }
        }
    });

    console.log('Tasks found:', tasks.length);
    tasks.forEach(t => console.log(`  Task: ${t.label} at ${t.dueDate?.toISOString()}`));

    console.log('Timeline Events found:', timelineEvents.length);
    timelineEvents.forEach(e => console.log(`  Event: ${e.summary} at ${e.timestamp.toISOString()}`));

    // Check ANY events to see what dates they have
    const latestEvent = await prisma.timelineEvent.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' }
    });
    if (latestEvent) {
        console.log('Latest Timeline Event date:', latestEvent.timestamp.toISOString());
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
