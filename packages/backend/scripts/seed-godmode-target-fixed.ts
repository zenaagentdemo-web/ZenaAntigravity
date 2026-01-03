import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const contactId = '9dc970ae-fb8c-4eee-9304-c7d6293f676a';
    const userId = 'd37ae645-48de-43ec-8db8-ea6430c77172';

    console.log('🌱 Seeding Targeted Godmode Mock Data...');

    // 1. Double check contact exists
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
        console.error('❌ Specified contact not found.');
        return;
    }

    // 2. Clear old verification events to avoid clutter
    await prisma.timelineEvent.deleteMany({
        where: {
            entityId: contactId,
            summary: { contains: '⚡' }
        }
    });

    // 3. Create a FULL GOD rich event (Sent Email)
    await prisma.timelineEvent.create({
        data: {
            userId,
            type: 'email',
            entityType: 'contact',
            entityId: contactId,
            summary: '⚡ Autonomous Email Sent: Contract Preparation',
            content: 'Zena detected the buyer requested a contract and automatically drafted/sent the preliminary agreement.',
            timestamp: new Date(),
            metadata: {
                godmode: true,
                mode: 'full_god',
                actionType: 'send_email',
                draftSubject: 'Contract Draft: 24 Ponsonby Road',
                draftBody: 'Hi there,\n\nFollowing our conversation about 24 Ponsonby Road, I have prepared the preliminary contract for your review. You can find it attached.\n\nBest,\nZena (Autonomous Assistant)',
                success: true,
                autoExecuted: true
            }
        }
    });

    // 4. Create a DEMI-GOD rich event (Proposed Follow-up)
    await prisma.timelineEvent.create({
        data: {
            userId,
            type: 'note',
            entityType: 'contact',
            entityId: contactId,
            summary: '✨ Godmode Proposal: Schedule Inspection',
            content: 'Zena analyzed the interaction and proposed a follow-up inspection for Saturday.',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            metadata: {
                godmode: true,
                mode: 'demi_god',
                actionType: 'schedule_followup',
                description: 'Suggesting a follow-up tour based on high intent signals.',
                success: true,
                autoExecuted: false
            }
        }
    });

    // 5. Create a PENDING action for the queue visibility
    await prisma.autonomousAction.create({
        data: {
            userId,
            contactId,
            actionType: 'send_email',
            priority: 10,
            title: '⚡ URGENT: Confirm VIP Viewing for ' + contact.name,
            description: 'Zena identifies this as a critical path to closing.',
            draftSubject: 'VIP Viewing Confirmed',
            draftBody: 'Your VIP viewing is set for tomorrow at 2 PM. See you there!',
            status: 'pending',
            mode: 'demi_god'
        }
    });

    console.log('✅ Targeted seeding complete! Please refresh the Contact Detail Page.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
