
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTasks() {
    const tasks = await prisma.task.findMany({
        where: {
            label: {
                contains: 'contract'
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log('Found tasks:', JSON.stringify(tasks, null, 2));

    const totalTasks = await prisma.task.count();
    console.log('Total tasks in DB:', totalTasks);

    const latestTasks = await prisma.task.findMany({
        take: 5,
        orderBy: {
            createdAt: 'desc'
        }
    });
    console.log('Latest 5 tasks:', JSON.stringify(latestTasks, null, 2));

    await prisma.$disconnect();
}

checkTasks();
