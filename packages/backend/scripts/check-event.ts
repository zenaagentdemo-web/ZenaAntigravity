import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEvent(id: string) {
    try {
        const event = await prisma.timelineEvent.findUnique({
            where: { id }
        });
        console.log('--- EVENT DATA ---');
        if (event) {
            console.log(JSON.stringify(event, null, 2));
        } else {
            console.log('Event not found in timelineEvent table.');

            // Check Property milestones just in case
            const properties = await prisma.property.findMany();
            for (const prop of properties) {
                const milestones = prop.milestones as any[];
                const milestone = milestones.find(m => m.id === id);
                if (milestone) {
                    console.log('Found as milestone in property:', prop.address);
                    console.log(JSON.stringify(milestone, null, 2));
                    break;
                }
            }
        }
        console.log('------------------');
    } catch (error) {
        console.error('Error checking event:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const eventId = process.argv[2] || '84721f26-9412-44fb-8909-c7460dba6484';
checkEvent(eventId);
