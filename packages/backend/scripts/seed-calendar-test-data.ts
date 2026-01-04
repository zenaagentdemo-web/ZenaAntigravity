import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('📅 Seeding Calendar Test Data...');

    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No user found. Please register first.');
        return;
    }

    const properties = await prisma.property.findMany({
        where: { userId: user.id },
        take: 3
    });

    if (properties.length === 0) {
        console.error('❌ No properties found for user. Run seed-smart-match-data.ts first.');
        return;
    }

    const now = new Date();

    // Helper to create a date relative to now
    const relativeDate = (days: number, hours: number = 10, mins: number = 0) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        d.setHours(hours, mins, 0, 0);
        return d.toISOString();
    };

    const testMilestones = [
        // Today
        { type: 'open_home', date: relativeDate(0, 10, 0), title: 'Morning Open Home', notes: 'Prepare brochures' },
        { type: 'viewing', date: relativeDate(0, 14, 30), title: 'Private Viewing - The Johnsons', notes: 'Strong interest' },

        // Tomorrow
        { type: 'auction', date: relativeDate(1, 11, 0), title: 'Auction Day!', notes: 'Expect multiple bidders' },

        // Later this week
        { type: 'open_home', date: relativeDate(3, 12, 0), title: 'Mid-week Open Home' },

        // Next week
        { type: 'listing', date: relativeDate(8, 9, 0), title: 'New Listing Presentation' },

        // Late this month (to test Month view)
        { type: 'settlement', date: relativeDate(20, 16, 0), title: 'Final Settlement' }
    ];

    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const milestonesToAdd = testMilestones.map(m => ({
            ...m,
            id: randomUUID(),
            title: `${m.title}: ${property.address.split(',')[0]}`,
        }));

        await prisma.property.update({
            where: { id: property.id },
            data: {
                milestones: milestonesToAdd
            }
        });
        console.log(`✅ Added ${milestonesToAdd.length} milestones to ${property.address}`);
    }

    console.log('✨ Calendar Seeding Complete!');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
