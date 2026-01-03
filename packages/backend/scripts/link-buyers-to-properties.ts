import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔗 Linking Buyers to Properties for Smart Match Testing...\n');

    // 1. Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No user found in database.');
        return;
    }

    // 2. Get active properties
    const properties = await prisma.property.findMany({
        where: { userId: user.id, status: 'active' },
        take: 5,
        include: { buyers: true }
    });

    if (properties.length === 0) {
        console.error('❌ No active properties found.');
        return;
    }

    // 3. Get buyer contacts
    const buyers = await prisma.contact.findMany({
        where: { userId: user.id, role: 'buyer' },
        take: 4
    });

    if (buyers.length === 0) {
        console.error('❌ No buyer contacts found. Run seed-smart-match-data.ts first.');
        return;
    }

    console.log(`Found ${properties.length} properties and ${buyers.length} buyers\n`);

    // 4. Link each buyer to a property (round-robin)
    for (let i = 0; i < buyers.length; i++) {
        const property = properties[i % properties.length];
        const buyer = buyers[i];

        // Check if already linked
        const isLinked = property.buyers.some(b => b.id === buyer.id);
        if (isLinked) {
            console.log(`ℹ️ "${buyer.name}" already linked to "${property.address.split(',')[0]}"`);
            continue;
        }

        await prisma.property.update({
            where: { id: property.id },
            data: {
                buyers: {
                    connect: { id: buyer.id }
                }
            }
        });

        console.log(`✅ Linked "${buyer.name}" → "${property.address.split(',')[0]}"`);
    }

    console.log('\n✨ Buyer-Property linking complete! Refresh your browser.\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
