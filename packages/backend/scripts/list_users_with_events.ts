import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: {
            _count: {
                select: {
                    properties: true,
                    tasks: true,
                    timelineEvents: true
                }
            }
        }
    });

    console.log('Users found:', users.length);
    users.forEach(u => {
        console.log(`User: ${u.name} (${u.id})`);
        console.log(`  Properties: ${u._count.properties}`);
        console.log(`  Tasks: ${u._count.tasks}`);
        console.log(`  Timeline Events: ${u._count.timelineEvents}`);
    });
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
