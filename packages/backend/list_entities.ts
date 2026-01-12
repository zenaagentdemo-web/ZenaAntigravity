
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const contacts = await prisma.contact.findMany({ take: 5, select: { name: true } });
    const properties = await prisma.property.findMany({ take: 5, select: { address: true } });

    console.log('Contacts:', contacts.map(c => c.name));
    console.log('Properties:', properties.map(p => p.address));
}

main().catch(console.error).finally(() => prisma.$disconnect());
