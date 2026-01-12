/**
 * Phase 7: Synapse Layer Verification Script
 * This script verifies that Zena can fetch "hidden" context (Voice Notes) 
 * linked to a contact when analyzing a related deal.
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/database.js';
import { contextRetrieverService } from '../src/services/context-retriever.service.js';
import { aiProcessingService } from '../src/services/ai-processing.service.js';

async function verifySynapse() {
    console.log('--- Phase 7: Synapse Layer (Deep Context) Verification ---');

    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No user found');

        // 1. Create a Test Contact
        const contact = await prisma.contact.create({
            data: {
                userId: user.id,
                name: 'James "Urgent" Miller',
                role: 'vendor',
                emails: ['james.m@example.com']
            }
        });

        // 2. Create a "Hidden" Voice Note for this contact (via Timeline Event)
        // Scenario: Vendor mentioned they are moving overseas in 2 weeks.
        const voiceNoteContent = "Meeting summary: James just told me he is moving to London in exactly 2 weeks. We MUST sell 45 Ocean Drive before then. He is extremely stressed about the timeline.";

        await prisma.timelineEvent.create({
            data: {
                userId: user.id,
                entityType: 'contact',
                entityId: contact.id,
                type: 'voice_note',
                summary: 'Voice Note: Moving to London in 2 weeks',
                content: voiceNoteContent,
                timestamp: new Date()
            }
        });

        // 3. Create a Deal for this contact
        const deal = await prisma.deal.create({
            data: {
                userId: user.id,
                pipelineType: 'seller',
                stage: 'LISTED',
                summary: 'Listing for 45 Ocean Drive',
                dealValue: 2500000,
                status: 'active',
                nextActionOwner: 'agent',
                contacts: { connect: { id: contact.id } }
            }
        });

        console.log(`✅ Simulation created for ${contact.name}`);
        console.log(`   - Hidden Context: "Moving to London in 2 weeks"`);
        console.log(`   - Target Deal: ${deal.id}`);

        // 4. Trigger Unified Context Retrieval (The Synapse)
        console.log('\n--- Firing Synapse Layer ---');
        const synapseContext = await contextRetrieverService.getUnifiedContext(user.id, 'deal', deal.id);
        const formattedContext = contextRetrieverService.formatForPrompt(synapseContext);

        console.log('\nSURFACED CONTEXT:');
        console.log(formattedContext);

        if (formattedContext.includes('London') || formattedContext.includes('2 weeks')) {
            console.log('✅ SUCCESS: Hidden context successfully surfaced from Contact Timeline to Deal Context.');
        } else {
            console.error('❌ FAIL: Hidden context was NOT found in Deal Synapse.');
        }

        // 5. Verify AI Sensitivity (Optional/Self-Check)
        const prompt = `
            Analyze the following deal. Is there a critical timeline risk?
            DEAL: ${deal.summary} at ${deal.stage} stage.
            
            ${formattedContext}
            
            RESPOND WITH "RISK_DETECTED" if you see the 2-week London move.
        `;

        const aiResponse = await aiProcessingService.callLLM(prompt);
        console.log(`\nAI ANALYSIS: ${aiResponse}`);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

verifySynapse();
