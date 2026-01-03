
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const propertyCount = await prisma.property.count();
    const contactCount = await prisma.contact.count();

    console.log(`Properties: ${propertyCount}`);
    console.log(`Contacts: ${contactCount}`);

    if (propertyCount > 0) {
        const firstProp = await prisma.property.findFirst();
        console.log('Sample Property:', firstProp);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
