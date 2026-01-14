
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Drive Mode Mock Data...');

    const user = await prisma.user.findUnique({
        where: { email: 'demo@zena.ai' }
    });

    if (!user) {
        console.error('User demo@zena.ai not found. Please run main seed first.');
        return;
    }

    // 1. Create 5 Contacts
    const contacts = await Promise.all([
        prisma.contact.create({
            data: {
                userId: user.id,
                name: 'Alice Henderson',
                role: 'Vendor',
                emails: ['alice.h@example.com'],
                phones: ['+64215550001'],
                intelligenceSnippet: 'Highly motivated vendor for 24 Ponsonby Road.'
            }
        }),
        prisma.contact.create({
            data: {
                userId: user.id,
                name: 'Bob Richards',
                role: 'Buyer',
                emails: ['bob.r@gmail.com'],
                phones: ['+64215550002'],
                intelligenceSnippet: 'Looking for a family home in Herne Bay. Budget $3M.'
            }
        }),
        prisma.contact.create({
            data: {
                userId: user.id,
                name: 'Charlie Stevens',
                role: 'Lawyer',
                emails: ['charlie@stevenslaw.co.nz'],
                phones: ['+64215550003'],
                intelligenceSnippet: 'Handling the settlement for the Mission Bay deal.'
            }
        }),
        prisma.contact.create({
            data: {
                userId: user.id,
                name: 'Diana Prince',
                role: 'Mortgage Broker',
                emails: ['diana.p@broker.nz'],
                phones: ['+64215550004'],
                intelligenceSnippet: 'Fast pre-approvals for high-net-worth clients.'
            }
        }),
        prisma.contact.create({
            data: {
                userId: user.id,
                name: 'Edward Norton',
                role: 'Vendor',
                emails: ['ed@nortonltd.com'],
                phones: ['+64215550005'],
                intelligenceSnippet: 'Previous client looking to list another property.'
            }
        })
    ]);

    console.log('Created 5 contacts.');

    // 2. Create 5 Appointments (TimelineEvents) with real Auckland addresses
    const now = new Date();
    const addresses = [
        { addr: '24 Ponsonby Road, Ponsonby, Auckland 1011', summary: 'Appraisal: Alice Henderson' },
        { addr: '12 Jervois Road, Herne Bay, Auckland 1011', summary: 'Viewing: Bob Richards' },
        { addr: '102 Tamaki Drive, Mission Bay, Auckland 1071', summary: 'Final Walkthrough: Mission Bay' },
        { addr: '88 Queen Street, Auckland CBD, Auckland 1010', summary: 'Meeting: Charlie Stevens (Lawyer)' },
        { addr: '45 Mount Eden Road, Mount Eden, Auckland 1024', summary: 'Listing Presentation: Edward Norton' }
    ];

    for (let i = 0; i < addresses.length; i++) {
        // Space them 1 hour apart starting from 30 mins from now
        const startTime = new Date(now.getTime() + (30 + i * 60) * 60 * 1000);
        await prisma.timelineEvent.create({
            data: {
                userId: user.id,
                type: 'appointment',
                entityType: 'appointment',
                entityId: contacts[i].id,
                summary: addresses[i].summary,
                content: `Scheduled appointment at ${addresses[i].addr}`,
                timestamp: startTime,
                metadata: {
                    location: addresses[i].addr,
                    participants: [contacts[i].id]
                }
            }
        });
    }

    console.log('Created 5 appointments with Auckland addresses.');

    // 3. Create 10 Tasks (Calls, Strategy, Triage)
    const taskData = [
        // Calls (3)
        { label: 'Call Alice Henderson re: Marketing plan', context: 'drive', contactId: contacts[0].id },
        { label: 'Phone Bob Richards about Herne Bay listing', context: 'drive', contactId: contacts[1].id },
        { label: 'Follow up Call: Diana Prince re: Pre-approval', context: 'drive', contactId: contacts[3].id },
        // Strategy (2)
        { label: 'Strategy: Mission Bay Negotiation Plan', context: 'desk' },
        { label: 'Review: Q3 Sales Targets and Pipeline', context: 'desk' },
        // Triage / Due Today (5)
        { label: 'Verify Deposit: 123 Main St', dueDate: now },
        { label: 'Send Contract: 45 Harbour View Dr', dueDate: now },
        { label: 'Update Milestone: 7a Garden Lane', dueDate: now },
        { label: 'Invoice: Professional Photography Kumeu', dueDate: now },
        { label: 'Prepare CMAs: Jervois Road Area', dueDate: now }
    ];

    for (const t of taskData) {
        await prisma.task.create({
            data: {
                userId: user.id,
                label: t.label,
                status: 'open',
                context: t.context || 'general',
                dueDate: (t as any).dueDate || new Date(now.getTime() + 24 * 60 * 60 * 1000),
                contactId: (t as any).contactId || null,
                source: 'manual'
            }
        });
    }

    console.log('Created 10 tasks.');
    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
