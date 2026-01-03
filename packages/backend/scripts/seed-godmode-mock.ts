import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Godmode Mock Data...');

    // 1. Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No user found in database. Please register first.');
        return;
    }

    // 2. Get first contact
    const contact = await prisma.contact.findFirst();
    if (!contact) {
        console.error('❌ No contact found in database. Please add a contact first.');
        return;
    }

    console.log(`👤 Seeding for User: ${user.email} and Contact: ${contact.firstName} ${contact.lastName}`);

    // 3. Create a PENDING action (for Queue Visibility & Deep Linking)
    const pendingAction = await prisma.autonomousAction.create({
        data: {
            userId: user.id,
            contactId: contact.id,
            actionType: 'send_email',
            priority: 9,
            title: 'Send high-intent follow-up to ' + contact.firstName,
            description: 'Zena detected high intent based on recent activity. Recommending a personalized follow-up.',
            draftSubject: 'Checking in on your search',
            draftBody: `Hi ${contact.firstName},\n\nI noticed you've been looking at some properties in the area recently. Would you like to schedule a quick call to discuss your preferences?\n\nBest,\nZena`,
            status: 'pending',
            mode: 'demi_god'
        }
    });
    console.log(`✅ Created Pending Action: ${pendingAction.id}`);

    // 4. Create a RICH Timeline Event (for Rich Activity Log)
    const timelineEvent = await prisma.timelineEvent.create({
        data: {
            userId: user.id,
            type: 'email',
            entityType: 'contact',
            entityId: contact.id,
            summary: '⚡ Autonomous Email Sent: Property Match',
            content: 'Zena automatically sent a property match email based on established preferences.',
            timestamp: new Date(),
            metadata: {
                godmode: true,
                mode: 'full_god',
                actionType: 'send_email',
                draftSubject: 'Perfect Match Found: 123 Neon Way',
                draftBody: `Hi ${contact.firstName},\n\nI found a property that matches 100% of your criteria. It just hit the market. Check it out here: https://zena.ai/properties/neon-way\n\n- Zena (Autonomous Agent)`,
                success: true,
                autoExecuted: true
            }
        }
    });
    console.log(`✅ Created Rich Timeline Event: ${timelineEvent.id}`);

    console.log('✨ Seeding complete! Refresh your browser to see the changes.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
