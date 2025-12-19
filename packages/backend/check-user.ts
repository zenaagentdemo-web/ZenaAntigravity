import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { id: 'demo-user-id' }
    });
    console.log('User demo-user-id:', user);
    process.exit(0);
}

checkUser().catch(err => {
    console.error(err);
    process.exit(1);
});
