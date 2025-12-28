import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting NZ mock data generation...');

    // 1. Get the demo user
    const user = await prisma.user.findUnique({
        where: { email: 'demo@zena.ai' },
    });

    if (!user) {
        console.error('Demo user not found. Please run seed.ts first.');
        return;
    }

    const aucklandAddresses = [
        '15 Jervois Road, Ponsonby, Auckland 1011',
        '42 Tamaki Drive, Mission Bay, Auckland 1071',
        '8 O\'Connell Street, Auckland CBD, Auckland 1010',
        '12A Marine Parade, Herne Bay, Auckland 1011',
        '101 Remuera Road, Remuera, Auckland 1050',
        '56 Shore Road, Remuera, Auckland 1050',
        '23 Lake Road, Devonport, Auckland 0624',
        '14 Portland Road, Remuera, Auckland 1050',
        '19 High Street, Auckland CBD, Auckland 1010',
        '33 Mount Eden Road, Mount Eden, Auckland 1024'
    ];

    const nzContacts = [
        { name: 'Liam Thompson', email: 'liam.thompson@xtra.co.nz', phone: '+64 21 456 7890', role: 'buyer' },
        { name: 'Olivia Wilson', email: 'olivia.wilson@gmail.com', phone: '+64 22 123 4567', role: 'vendor' },
        { name: 'Noah Smith', email: 'noah.smith@outlook.com', phone: '+64 27 987 6543', role: 'buyer' },
        { name: 'Emma Davis', email: 'emma.davis@me.com', phone: '+64 21 555 1234', role: 'vendor' },
        { name: 'Jack Brown', email: 'jack.brown@rocketmail.com', phone: '+64 22 888 7766', role: 'buyer' },
        { name: 'Sophia Taylor', email: 'sophia.taylor@windowslive.com', phone: '+64 27 333 4455', role: 'vendor' },
        { name: 'Mason Anderson', email: 'mason.anderson@yahoo.co.nz', phone: '+64 21 000 1122', role: 'buyer' },
        { name: 'Isabella Thomas', email: 'isabella.thomas@icloud.com', phone: '+64 22 777 9900', role: 'vendor' },
        { name: 'William Jackson', email: 'william.jackson@provider.nz', phone: '+64 27 111 2233', role: 'buyer' },
        { name: 'Mia White', email: 'mia.white@gmail.co.nz', phone: '+64 21 666 4433', role: 'vendor' }
    ];

    const dealStages = ['buyer_consult', 'viewings', 'offer_made', 'conditional', 'settled', 'appraisal', 'marketing', 'offers_received', 'unconditional', 'nurture'];

    console.log('Generating 10 properties and contacts...');

    for (let i = 0; i < 10; i++) {
        const address = aucklandAddresses[i];
        const contactData = nzContacts[i];

        // Create Property
        const property = await prisma.property.create({
            data: {
                userId: user.id,
                address: address,
                status: contactData.role === 'vendor' ? 'active' : 'under_contract',
                listingPrice: Math.floor(Math.random() * (3000000 - 800000) + 800000),
                type: 'residential',
                milestones: [],
            },
        });

        // Create Contact
        const contact = await prisma.contact.create({
            data: {
                userId: user.id,
                name: contactData.name,
                emails: [contactData.email],
                phones: [contactData.phone],
                role: contactData.role as any,
            },
        });

        // Create Deal
        const pipelineType = contactData.role === 'buyer' ? 'buyer' : 'seller';
        const stage = dealStages[i];

        await prisma.deal.create({
            data: {
                userId: user.id,
                propertyId: property.id,
                pipelineType: pipelineType,
                stage: stage,
                dealValue: property.listingPrice,
                summary: `High priority deal for ${property.address}`,
                nextActionOwner: 'agent',
                nextAction: 'Follow up on progress',
                stageEnteredAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
                riskLevel: i % 3 === 0 ? 'medium' : 'none',
                contacts: {
                    connect: { id: contact.id },
                },
            },
        });

        console.log(`Created: ${address} - Contact: ${contactData.name}`);
    }

    console.log('NZ mock data generation completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
