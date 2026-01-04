const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = '592198db-ed3f-4b98-97e5-e9f5c710d7df';

    console.log('--- Seeding Mock Contacts ---');
    const contactData = [
        { name: 'John Smith', emails: ['john.smith@example.com'], phones: ['021-123-4567'], role: 'buyer' },
        { name: 'Sarah Wilson', emails: ['sarah.w@homemail.com'], phones: ['022-987-6543'], role: 'vendor' },
        { name: 'Michael Chen', emails: ['m.chen@techglobal.com'], phones: ['027-444-5555'], role: 'investor' },
        { name: 'Emma Davis', emails: ['emma.d@outlook.com'], phones: ['021-999-0000'], role: 'buyer' },
        { name: 'Robert Taylor', emails: ['rtaylor@gmail.com'], phones: ['024-555-1212'], role: 'vendor' },
    ];

    const contacts = [];
    for (const data of contactData) {
        const contact = await prisma.contact.create({
            data: { ...data, userId }
        });
        contacts.push(contact);
        console.log(`Created contact: ${contact.name}`);
    }

    console.log('\n--- Seeding Mock Properties ---');
    const propertyData = [
        { address: '128 Ponsonby Road, Auckland', type: 'residential', status: 'active', listingPrice: 1850000, bedrooms: 3, bathrooms: 2, landSize: '450' },
        { address: '45 Marine Parade, Mission Bay', type: 'residential', status: 'active', listingPrice: 3200000, bedrooms: 4, bathrooms: 3, landSize: '800' },
        { address: '12/88 Customs Street West, Viaduct', type: 'residential', status: 'active', listingPrice: 1250000, bedrooms: 2, bathrooms: 2, landSize: '110' },
        { address: '202 Scenic Drive, Titirangi', type: 'residential', status: 'active', listingPrice: 1450000, bedrooms: 4, bathrooms: 2, landSize: '1200' },
        { address: '77 Parnell Road, Parnell', type: 'residential', status: 'active', listingPrice: 2100000, bedrooms: 3, bathrooms: 1, landSize: '350' },
    ];

    const properties = [];
    for (const data of propertyData) {
        const property = await prisma.property.create({
            data: { ...data, userId }
        });
        properties.push(property);
        console.log(`Created property: ${property.address}`);
    }

    console.log('\n--- Seeding Mock Godmode Actions (Contacts) ---');
    const contactActions = [
        {
            contactId: contacts[0].id,
            actionType: 'send_email',
            title: 'Send Market Update to John Smith',
            description: 'John has been looking at 3-bedroom properties in Ponsonby. Send him the latest quarterly report.',
            priority: 8,
            mode: 'demi_god'
        },
        {
            contactId: contacts[1].id,
            actionType: 'schedule_followup',
            title: 'Schedule Appraisal with Sarah Wilson',
            description: 'Sarah mentioned listing her property in 2 months. Follow up to secure the appraisal date.',
            priority: 9,
            mode: 'demi_god'
        },
        {
            contactId: contacts[2].id,
            actionType: 'update_category',
            title: 'Upgrade Michael Chen to High Intent',
            description: 'Michael has attended 3 viewings this week. Zena recommends shifting him to High Intent.',
            priority: 6,
            mode: 'demi_god'
        },
        {
            contactId: contacts[3].id,
            actionType: 'send_email',
            title: 'Pre-approval Check-in with Emma Davis',
            description: "Emma's pre-approval might be expiring soon. Check in to see if she's refreshed it.",
            priority: 7,
            mode: 'demi_god'
        },
        {
            contactId: contacts[4].id,
            actionType: 'archive_contact',
            title: 'Archive Robert Taylor (Stale)',
            description: 'No response from Robert after 5 follow-ups. Zena suggests archiving to clean the pulse.',
            priority: 3,
            mode: 'demi_god'
        },
    ];

    for (const action of contactActions) {
        await prisma.autonomousAction.create({
            data: { ...action, userId, status: 'pending' }
        });
        console.log(`Created contact action: ${action.title}`);
    }

    console.log('\n--- Seeding Mock Godmode Actions (Properties) ---');
    const propertyActions = [
        {
            propertyId: properties[0].id,
            actionType: 'price_review',
            title: 'Perform Price Review for 128 Ponsonby Road',
            description: 'Listing is now 25 days old with declining inquiry volume. Consider a 5% price adjustment.',
            priority: 9,
            mode: 'demi_god'
        },
        {
            propertyId: properties[1].id,
            actionType: 'vendor_update',
            title: 'Send Vendor Report to 45 Marine Parade',
            description: 'Weekly summary of viewings and buyer feedback is ready to be sent to the vendor.',
            priority: 7,
            mode: 'demi_god'
        },
        {
            propertyId: properties[2].id,
            actionType: 'buyer_match_intro',
            title: 'Match 12/88 Customs St with 3 High-Intent Buyers',
            description: 'Zena has identified 3 buyers whose requirements perfectly match this apartment.',
            priority: 8,
            mode: 'demi_god'
        },
        {
            propertyId: properties[3].id,
            actionType: 'vendor_update',
            title: 'Recommend Professional Photography for 202 Scenic Drive',
            description: 'Initial listing photos are generating lower CTR than suburb average. Recommend reshoot.',
            priority: 5,
            mode: 'demi_god'
        },
        {
            propertyId: properties[4].id,
            actionType: 'price_review',
            title: 'Confirm Valuation for 77 Parnell Road',
            description: 'New comparable sale at 75 Parnell Road suggests this listing may be under-priced.',
            priority: 6,
            mode: 'demi_god'
        },
    ];

    for (const action of propertyActions) {
        await prisma.autonomousAction.create({
            data: { ...action, userId, status: 'pending' }
        });
        console.log(`Created property action: ${action.title}`);
    }

    console.log('\n--- Seeding Complete! ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
