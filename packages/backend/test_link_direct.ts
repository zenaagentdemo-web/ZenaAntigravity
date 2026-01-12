
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testLink() {
    const contactId = '0487fc5a-e327-469f-8419-1771a3770981';
    const propertyId = '127269cc-a12f-4ef8-bf33-01bf1b7ce3af';
    const userId = '285f391f-e55b-4c49-9778-f00f830b7b4a'; // demo@zena.ai

    console.log('Testing link-vendor logic...');
    try {
        const result = await prisma.property.update({
            where: { id: propertyId, userId },
            data: {
                vendors: {
                    connect: { id: contactId }
                }
            },
            include: { vendors: true }
        });
        console.log('Success! Linked vendors:', result.vendors.map(v => v.name));
    } catch (err) {
        console.error('Failed to link:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

testLink();
