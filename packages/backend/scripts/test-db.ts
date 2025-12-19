import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('Testing Prisma connection...');
        const userCount = await prisma.user.count();
        console.log('Connection successful! User count:', userCount);

        console.log('Testing ChatConversation connection...');
        const convCount = await prisma.chatConversation.count();
        console.log('ChatConversation count:', convCount);

    } catch (err) {
        console.error('Prisma connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
