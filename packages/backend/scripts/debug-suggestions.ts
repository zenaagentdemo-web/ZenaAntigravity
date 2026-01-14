import { calendarActionsService } from '../src/services/calendar-actions.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Finding a suitable event...');
        // Find an event that is in the past to replicate user scenario
        const specificId = '963a0368-59bd-4837-97c1-b0b78937d4bc';
        const event = await prisma.timelineEvent.findUnique({
            where: { id: specificId }
        });

        if (!event) {
            console.log('No past event found. Creating one...');
            // handle creation if needed, but likely there is one
            return;
        }

        console.log(`Testing suggestions for event: ${event.id} (${event.summary} at ${event.timestamp})`);

        const suggestions = await calendarActionsService.getRescheduleSuggestions(
            event.userId,
            event.id,
            'timeline_event'
        );

        console.log('--- SUGGESTIONS RESULT ---');
        console.log(JSON.stringify(suggestions, null, 2));
        console.log('--------------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
