import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting mock data generation...');

    // 1. Get the demo user
    const user = await prisma.user.findUnique({
        where: { email: 'demo@zena.ai' },
    });

    if (!user) {
        console.error('Demo user not found. Please run seed.ts first.');
        return;
    }

    // 2. Get or create email account
    let emailAccount = await prisma.emailAccount.findFirst({
        where: { userId: user.id },
    });

    if (!emailAccount) {
        emailAccount = await prisma.emailAccount.create({
            data: {
                userId: user.id,
                provider: 'gmail',
                email: 'demo@zena.ai',
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
    }

    // 3. Create a property to link things to
    const property = await prisma.property.create({
        data: {
            userId: user.id,
            address: 'Mock Property ' + Math.floor(Math.random() * 1000),
            milestones: [],
        },
    });

    // 4. Create 20 "New" (Focus) Emails
    console.log('Generating 20 "New" (Focus) emails...');
    for (let i = 1; i <= 20; i++) {
        const thread = await prisma.thread.create({
            data: {
                userId: user.id,
                emailAccountId: emailAccount.id,
                externalId: `mock-new-${i}`,
                subject: `New Inquiry ${i}: Potential buyer for ${property.address}`,
                participants: [
                    { name: `Buyer ${i}`, email: `buyer${i}@example.com` },
                    { name: 'Demo Agent', email: 'demo@zena.ai' }
                ],
                lastMessageAt: new Date(Date.now() - i * 3600000), // Spaced out by hours
                summary: `This is a mock summary for new email ${i}. The buyer is interested in the property features.`,
                classification: 'buyer',
                category: 'focus',
                riskLevel: i % 5 === 0 ? 'medium' : 'low',
                nextActionOwner: 'agent',
                nextAction: 'Reply to inquiry',
                propertyId: property.id,
            },
        });

        await prisma.message.create({
            data: {
                threadId: thread.id,
                externalId: `msg-new-${i}`,
                from: JSON.stringify({ name: `Buyer ${i}`, email: `buyer${i}@example.com` }),
                to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
                subject: thread.subject,
                body: `Hi, I'm interested in the property. Can you provide more details? This is mock email ${i}.`,
                sentAt: thread.lastMessageAt,
                receivedAt: thread.lastMessageAt,
                isFromUser: false,
            },
        });
    }

    // 5. Create 10 "Awaiting" (Waiting) Emails
    console.log('Generating 10 "Awaiting" (Waiting) emails...');
    for (let i = 1; i <= 10; i++) {
        const thread = await prisma.thread.create({
            data: {
                userId: user.id,
                emailAccountId: emailAccount.id,
                externalId: `mock-awaiting-${i}`,
                subject: `Waiting for ${i}: Solicitor feedback for ${property.address}`,
                participants: [
                    { name: `Solicitor ${i}`, email: `solicitor${i}@lawyer.com` },
                    { name: 'Demo Agent', email: 'demo@zena.ai' }
                ],
                lastMessageAt: new Date(Date.now() - (i + 24) * 3600000), // Older messages
                lastReplyAt: new Date(Date.now() - (i + 25) * 3600000),
                summary: `This is a mock summary for awaiting email ${i}. We are waiting for the contract review.`,
                classification: 'lawyer_broker',
                category: 'waiting',
                riskLevel: 'low',
                nextActionOwner: 'other',
                nextAction: 'Wait for solicitor',
                propertyId: property.id,
            },
        });

        await prisma.message.create({
            data: {
                threadId: thread.id,
                externalId: `msg-awaiting-${i}`,
                from: JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' }),
                to: [JSON.stringify({ name: `Solicitor ${i}`, email: `solicitor${i}@lawyer.com` })],
                subject: thread.subject,
                body: `Hi, following up on the contract review. This is mock waiting email ${i}.`,
                sentAt: thread.lastReplyAt!,
                receivedAt: thread.lastReplyAt!,
                isFromUser: true,
            },
        });
    }

    // 6. Create 10 Deal Flow Mock Deals with unique properties
    console.log('Generating 10 deals with unique properties...');
    const buyerStages = ['buyer_consult', 'viewings', 'offer_made', 'conditional', 'settled'];
    const sellerStages = ['appraisal', 'marketing', 'offers_received', 'unconditional', 'nurture'];

    const nzStreets = [
        'Karaka Street, Ponsonby',
        'Ocean View Road, Takapuna',
        'Mission Bay Drive, Kohimarama',
        'Riverside Terrace, Hamilton',
        'Harbour View Drive, Wellington'
    ];
    const nzSellerStreets = [
        'Lake Road, Rothesay Bay',
        'Cambridge Terrace, Christchurch',
        'Beach Road, Tauranga',
        'Great North Road, Grey Lynn',
        'High Street, Auckland CBD'
    ];

    for (let i = 1; i <= 10; i++) {
        const isBuyer = i <= 5;
        const stage = isBuyer ? buyerStages[i - 1] : sellerStages[i - 6];
        const streets = isBuyer ? nzStreets : nzSellerStreets;
        const streetIndex = isBuyer ? i - 1 : i - 6;
        const streetNum = Math.floor(Math.random() * 100) + 1;

        const dealProperty = await prisma.property.create({
            data: {
                userId: user.id,
                address: `${streetNum} ${streets[streetIndex]}`,
                milestones: [],
            },
        });

        const contact = await prisma.contact.create({
            data: {
                userId: user.id,
                name: `${isBuyer ? 'Buyer' : 'Seller'} Contact ${i}`,
                emails: [`contact${i}@example.com`],
                role: isBuyer ? 'buyer' : 'vendor',
            },
        });

        const dealValues = [850000, 920000, 1200000, 1500000, 780000, 990000, 1100000, 1350000, 650000, 1800000];
        const riskLevels = ['none', 'none', 'none', 'medium', 'high', 'none', 'none', 'critical', 'none', 'none'];

        await prisma.deal.create({
            data: {
                userId: user.id,
                propertyId: dealProperty.id,
                pipelineType: isBuyer ? 'buyer' : 'seller',
                stage: stage,
                riskLevel: riskLevels[i - 1],
                dealValue: dealValues[i - 1],
                summary: `Deal for ${dealProperty.address}`,
                nextActionOwner: 'agent',
                nextAction: `Follow up on ${stage.replace('_', ' ')}`,
                stageEnteredAt: new Date(Date.now() - (i * 2) * 24 * 60 * 60 * 1000), // Vary days in stage
                contacts: {
                    connect: { id: contact.id },
                },
            },
        });
    }

    console.log('Mock data generation completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
