
import prisma from './src/config/database.js';

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            take: 5,
            select: {
                id: true,
                email: true,
                passwordHash: true,
                name: true
            }
        });
        console.log('Users found:', users);
    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
