import prisma from '../src/config/database.js';

async function main() {
    console.log('🔍 Checking users and contacts...');

    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: {
                        contacts: true,
                        properties: true
                    }
                }
            }
        });

        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ${u.email} (${u.id}): ${u._count.contacts} contacts, ${u._count.properties} properties`);
        });

    } catch (error) {
        console.error('❌ Error checking users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
