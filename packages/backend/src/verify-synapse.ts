import { contextRetrieverService } from './services/context-retriever.service.js';
import prisma from './config/database.js';
import { logger } from './services/logger.service.js';

async function verifySynapse() {
    console.log('🧠 STARTING SYNAPSE LAYER VERIFICATION 🧠');

    try {
        // 1. Setup Test Data
        const timestamp = Date.now();
        const user = await prisma.user.create({
            data: {
                email: `test-synapse-${timestamp}@test.com`,
                name: 'Synapse Tester',
                passwordHash: 'hash',
            }
        });

        // 2. Create a Contact with Hidden Context (The "Silo")
        const contact = await prisma.contact.create({
            data: {
                userId: user.id,
                name: 'John Silo',
                role: 'vendor',
                emails: [`john-${timestamp}@test.com`]
            }
        });

        // 3. Create a Timeline Event on the Contact (The "Secret")
        await prisma.timelineEvent.create({
            data: {
                userId: user.id,
                entityType: 'contact',
                entityId: contact.id,
                type: 'voice_note',
                summary: 'Client mentioned divorce proceedings have started. Urgent sale required.',
                timestamp: new Date()
            }
        });

        // 4. Create a Deal linked to this Contact
        const deal = await prisma.deal.create({
            data: {
                userId: user.id,
                stage: 'negotiation',
                pipelineType: 'seller',
                nextActionOwner: 'agent',
                summary: 'Test Deal for Synapse',
                contacts: { connect: { id: contact.id } }
            }
        });

        console.log(`✅ Test Data Created: Deal ${deal.id} linked to Contact ${contact.id}`);

        // 5. TEST: Ask the Brain Stem for Context
        console.log('🧠 Requesting Unified Context for Deal...');
        const context = await contextRetrieverService.getUnifiedContext(user.id, 'deal', deal.id);

        // 6. Verify Results
        console.log('\n--- SYNAPSE OUTPUT ---');
        const formatted = contextRetrieverService.formatForPrompt(context);
        console.log(formatted);
        console.log('----------------------\n');

        if (formatted.includes('divorce proceedings')) {
            console.log('✅ PASS: Synapse Layer successfully retrieved hidden contact context!');
        } else {
            console.error('❌ FAIL: Hidden context not found in Synapse output.');
            process.exit(1);
        }

        // Cleanup
        await prisma.user.delete({ where: { id: user.id } });

    } catch (error) {
        console.error('❌ Verification Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verifySynapse().catch(console.error);
