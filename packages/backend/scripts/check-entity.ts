
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkEntity(id: string) {
    console.log(`Checking ID: ${id}`);

    const task = await prisma.task.findUnique({ where: { id } });
    if (task) {
        console.log('Found in TASK table:');
        console.log(JSON.stringify(task, null, 2));
        return;
    }

    const timelineEvent = await prisma.timelineEvent.findUnique({ where: { id } });
    if (timelineEvent) {
        console.log('Found in TIMELINEEVENT table:');
        console.log(JSON.stringify(timelineEvent, null, 2));
        return;
    }

    const properties = await prisma.property.findMany();
    for (const prop of properties) {
        const milestones = (prop.milestones as any[]) || [];
        const ms = milestones.find(m => m.id === id);
        if (ms) {
            console.log(`Found in PROPERTY MILESTONES for property ${prop.address} (${prop.id}):`);
            console.log(JSON.stringify(ms, null, 2));
            return;
        }
    }

    console.log('ID NOT FOUND IN ANY RELEVANT TABLE');
}

checkEntity('f6428b22-002a-4958-b2ac-59fd29176226')
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
