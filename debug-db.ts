
import prisma from './packages/backend/src/config/database.ts';

async function checkDatabase() {
    console.log('--- DB CALENDAR EVENT DUMP ---');
    const events = await prisma.timelineEvent.findMany({
        where: {
            entityType: 'calendar_event'
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10
    });

    if (events.length === 0) {
        console.log('No calendar events found in database.');
    } else {
        events.forEach(e => {
            console.log(`[${e.createdAt.toISOString()}] ${e.summary} - Time: ${e.timestamp.toISOString()}`);
            console.log(`   Type: ${e.type}, EntityId: ${e.entityId}, Metadata: ${JSON.stringify(e.metadata)}`);
        });
    }
}

checkDatabase().catch(console.error).finally(() => prisma.$disconnect());
