
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProperty() {
    const property = await prisma.property.findUnique({
        where: { id: 'e6b29522-a0f5-4cb7-9b08-43f8853d729c' }
    });

    console.log('Property details:', JSON.stringify(property, null, 2));

    await prisma.$disconnect();
}

checkProperty();
