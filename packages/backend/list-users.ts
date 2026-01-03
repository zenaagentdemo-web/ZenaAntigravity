import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listUsers() {
    const users = await prisma.user.findMany();
    console.log('Current users in database:', JSON.stringify(users, null, 2));
    process.exit(0);
}

listUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
