import prisma from '../src/config/database.js';

async function seedResearchData() {
    console.log('--- Seeding Phase 4 Research Data ---');

    const userId = 'stress-test-agent-001';

    // 1. Ensure user exists (already does, but safe)
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            email: 'agent@stress.test',
            name: 'Stress Test Agent',
            passwordHash: 'hashed'
        }
    });

    // 2. Create Property
    const property = await prisma.property.create({
        data: {
            userId,
            address: '45 Victoria Avenue, Remuera',
            type: 'residential',
            status: 'active',
            bedrooms: 4,
            bathrooms: 3,
            listingPrice: 3500000,
        }
    });

    // 3. Create Contact (Buyer)
    const contact = await prisma.contact.create({
        data: {
            userId,
            name: 'Sarah Thompson',
            emails: ['sarah.t@example.com'],
            role: 'buyer',
            intelligenceSnippet: 'High-intent buyer. Looking for family home in Remuera.',
        }
    });

    // 4. Create Deal
    const deal = await prisma.deal.create({
        data: {
            userId,
            propertyId: property.id,
            stage: 'qualified',
            pipelineType: 'buyer',
            summary: 'Sarah is very interested in the Remuera property. Needs to sell her current home first.',
            nextActionOwner: 'agent',
            contacts: {
                connect: [{ id: contact.id }]
            }
        }
    });

    // 5. Create some Timeline Events (The raw context)
    await prisma.timelineEvent.createMany({
        data: [
            {
                userId,
                type: 'voice_note',
                entityType: 'contact',
                entityId: contact.id,
                summary: 'Sarah mentioned her budget is flexible up to $3.8M if the garden is north-facing.',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                userId,
                type: 'email',
                entityType: 'deal',
                entityId: deal.id,
                summary: 'Sarah requested a second viewing with her architect.',
                content: 'Hi Zena, I would like to bring my architect back to 45 Victoria Ave tomorrow at 2pm. Can you confirm with the vendors?',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ]
    });

    console.log('✅ Seeded property, contact, deal and timeline events.');
}

seedResearchData().catch(console.error).finally(() => process.exit());
