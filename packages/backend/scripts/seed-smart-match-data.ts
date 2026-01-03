import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧠 Seeding Smart Match Test Data...');

    // 1. Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No user found in database. Please register first.');
        return;
    }

    console.log(`👤 Seeding for User: ${user.email}`);

    // 2. Get or create active properties
    let properties = await prisma.property.findMany({
        where: { userId: user.id, status: 'active' },
        take: 5
    });

    if (properties.length === 0) {
        // Create some sample properties if none exist
        const sampleProperties = [
            {
                userId: user.id,
                address: '88 Country Lane, Parnell, Auckland',
                type: 'residential',
                status: 'active',
                listingPrice: 1850000,
                bedrooms: 4,
                bathrooms: 3,
                milestones: []
            },
            {
                userId: user.id,
                address: '12 Ocean View Road, Takapuna, Auckland',
                type: 'residential',
                status: 'active',
                listingPrice: 2450000,
                bedrooms: 5,
                bathrooms: 3,
                milestones: []
            },
            {
                userId: user.id,
                address: '245 CBD Apartment, Queen Street, Auckland',
                type: 'residential',
                status: 'active',
                listingPrice: 420000,
                bedrooms: 1,
                bathrooms: 1,
                milestones: []
            }
        ];

        for (const prop of sampleProperties) {
            await prisma.property.create({ data: prop });
        }

        properties = await prisma.property.findMany({
            where: { userId: user.id, status: 'active' }
        });

        console.log(`✅ Created ${properties.length} sample properties`);
    }

    // 3. Create buyer contacts with detailed preferences
    const buyerData = [
        {
            name: 'Sarah Mitchell',
            emails: ['sarah.mitchell@email.co.nz'],
            phones: ['+64 21 555 0101'],
            role: 'buyer',
            intelligenceSnippet: 'Active buyer seeking 4+ bedroom family home in Parnell or Remuera. Budget: $1.5M-$2M. Pre-approved finance. Highly motivated, needs to settle by March 2026.',
            relationshipNotes: ['First met at open home', 'Finance pre-approved', 'School zoning priority']
        },
        {
            name: 'James Chen',
            emails: ['james.chen@gmail.com'],
            phones: ['+64 22 888 0202'],
            role: 'buyer',
            intelligenceSnippet: 'Investment buyer with cash ready. Looking for 2-3 properties in $400K-$600K range. Prefers Auckland CBD apartments or Takapuna units. Quick settlement possible.',
            relationshipNotes: ['Cash buyer', 'Existing landlord', 'Wants multiple purchases']
        },
        {
            name: 'Emma and David Wilson',
            emails: ['emma.wilson@outlook.com', 'david.wilson@outlook.com'],
            phones: ['+64 27 999 0303'],
            role: 'buyer',
            intelligenceSnippet: 'First home buyers looking in Takapuna, Milford, or Devonport. Budget up to $2.5M for the right property. 5+ bedrooms ideal for growing family. Currently renting.',
            relationshipNotes: ['First home buyers', 'Large family needs', 'Flexible on timing']
        },
        {
            name: 'Michael O\'Connor',
            emails: ['moconnor@corporate.co.nz'],
            phones: ['+64 21 777 0404'],
            role: 'buyer',
            intelligenceSnippet: 'Downsizing from large rural property. Seeking modern apartment in premium location. Budget $800K-$1.2M. Prefers Queen Street CBD or Ponsonby.',
            relationshipNotes: ['Sold previous property', 'Wants lock-and-leave', 'Quality finishes priority']
        }
    ];

    const createdBuyers = [];
    for (const buyer of buyerData) {
        // Check if buyer already exists
        const existingBuyer = await prisma.contact.findFirst({
            where: { userId: user.id, name: buyer.name }
        });

        if (existingBuyer) {
            console.log(`ℹ️ Buyer "${buyer.name}" already exists, updating...`);
            const updated = await prisma.contact.update({
                where: { id: existingBuyer.id },
                data: {
                    role: 'buyer',
                    intelligenceSnippet: buyer.intelligenceSnippet,
                    relationshipNotes: buyer.relationshipNotes
                }
            });
            createdBuyers.push(updated);
        } else {
            const created = await prisma.contact.create({
                data: {
                    userId: user.id,
                    ...buyer
                }
            });
            createdBuyers.push(created);
            console.log(`✅ Created Buyer: ${created.name}`);
        }
    }

    // 4. Link buyers to properties
    // Sarah -> 88 Country Lane (perfect match)
    // James -> CBD Apartment (budget match)
    // Emma/David -> Ocean View Road (location match)
    const linkingPlan = [
        { buyerName: 'Sarah Mitchell', propertyAddress: '88 Country Lane' },
        { buyerName: 'James Chen', propertyAddress: '245 CBD Apartment' },
        { buyerName: 'Emma and David Wilson', propertyAddress: '12 Ocean View Road' },
        { buyerName: 'Michael O\'Connor', propertyAddress: '245 CBD Apartment' }
    ];

    for (const link of linkingPlan) {
        const buyer = createdBuyers.find(b => b.name === link.buyerName);
        const property = properties.find(p => p.address.includes(link.propertyAddress));

        if (buyer && property) {
            await prisma.property.update({
                where: { id: property.id },
                data: {
                    buyers: {
                        connect: { id: buyer.id }
                    }
                }
            });
            console.log(`🔗 Linked "${buyer.name}" to "${property.address.split(',')[0]}"`);
        }
    }

    // 5. Create intelligence predictions for properties (for Strategy tabs)
    for (const property of properties) {
        // Check if prediction exists
        const existingPrediction = await prisma.propertyPrediction.findUnique({
            where: { propertyId: property.id }
        });

        const momentumScore = property.address.includes('Country Lane') ? 85 :
            property.address.includes('Ocean View') ? 72 :
                property.address.includes('CBD') ? 35 : 50;

        const buyerInterestLevel = momentumScore >= 80 ? 'Hot' :
            momentumScore >= 60 ? 'High' :
                momentumScore >= 40 ? 'Medium' : 'Low';

        const reasoning = property.address.includes('Country Lane')
            ? 'Strong buyer interest with 2 registered parties. Property is receiving 4x more enquiries than area average.'
            : property.address.includes('Ocean View')
                ? 'Premium location driving steady interest. First home buyer activity detected.'
                : property.address.includes('CBD')
                    ? 'Listing has been on market for 45 days with declining momentum. Price fatigue detected.'
                    : 'Market average performance.';

        const suggestedActions = property.address.includes('Country Lane')
            ? [
                { action: 'Pull forward auction date by 7 days', reasoning: 'Market response is very high. Capitalize on FOMO among the top 3 cash buyers who have registered interest.', impact: 'High' },
                { action: 'Schedule exclusive viewing for Sarah Mitchell', reasoning: 'Pre-approved buyer with strong budget alignment. Private viewing increases psychological commitment.', impact: 'High' }
            ]
            : property.address.includes('CBD')
                ? [
                    { action: 'Recommend price shift to vendor', reasoning: 'Current price is 5% above buyer sweet spot. Adjusting to "Offers over $399k" could trigger new alerts.', impact: 'High' },
                    { action: 'Refresh marketing imagery', reasoning: 'Listing fatigue detected. New photography and virtual tour can reset market perception.', impact: 'Medium' }
                ]
                : [
                    { action: 'Schedule vendor update call', reasoning: 'Regular communication maintains vendor confidence during the campaign.', impact: 'Medium' }
                ];

        if (existingPrediction) {
            await prisma.propertyPrediction.update({
                where: { propertyId: property.id },
                data: {
                    momentumScore,
                    buyerInterestLevel,
                    reasoning,
                    suggestedActions,
                    confidenceScore: 0.85,
                    lastAnalyzedAt: new Date()
                }
            });
        } else {
            await prisma.propertyPrediction.create({
                data: {
                    propertyId: property.id,
                    momentumScore,
                    buyerInterestLevel,
                    reasoning,
                    suggestedActions,
                    confidenceScore: 0.85,
                    milestoneForecasts: [],
                    lastAnalyzedAt: new Date()
                }
            });
        }

        console.log(`🧠 Updated intelligence for "${property.address.split(',')[0]}" (Momentum: ${momentumScore})`);
    }

    console.log('\n✨ Smart Match Seeding Complete!');
    console.log('📊 Summary:');
    console.log(`   ${createdBuyers.length} buyer contacts created/updated`);
    console.log(`   ${properties.length} properties enriched with intelligence`);
    console.log('\n🔄 Refresh your browser to see the changes in the Smart Match Modal.\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
