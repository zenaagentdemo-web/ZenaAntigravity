/**
 * Phase 7: Proactive Nudges Verification Script
 * This script verifies that Zena uses the Synapse Layer to identify 
 * strategic risks and proactively suggests corrective actions (nudges).
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/database.js';
import { AskZenaService } from '../src/services/ask-zena.service.js';

async function verifyNudges() {
    console.log('--- Phase 7: Proactive Nudges Verification ---');

    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No user found');

        // 1. Create a Test Contact with "Hidden" Urgency
        const contact = await prisma.contact.upsert({
            where: { id: 'test-contact-nudge' },
            update: {},
            create: {
                id: 'test-contact-nudge',
                userId: user.id,
                name: 'Sarah London',
                role: 'vendor',
                emails: ['sarah.l@example.com']
            }
        });

        // "Hidden" context in contact timeline
        await prisma.timelineEvent.create({
            data: {
                userId: user.id,
                entityType: 'contact',
                entityId: contact.id,
                type: 'voice_note',
                summary: 'Voice Note: Moving to London in 2 weeks',
                content: "Internal note: Sarah just confirmed her flight to London is in 2 weeks. She is terrified the property won't sell by then. She's open to anything to move it fast.",
                timestamp: new Date()
            }
        });

        // 2. Create a Deal for this contact
        const deal = await prisma.deal.upsert({
            where: { id: 'test-deal-nudge' },
            update: { stage: 'LISTED' },
            create: {
                id: 'test-deal-nudge',
                userId: user.id,
                pipelineType: 'seller',
                stage: 'LISTED',
                summary: 'Listing for 45 Ocean Drive',
                status: 'active',
                nextActionOwner: 'agent',
                contacts: { connect: { id: contact.id } }
            }
        });

        console.log(`✅ Environment setup for Sarah London at 45 Ocean Drive`);

        // 3. User asks a general "Read" query
        const askZenaService = new AskZenaService();
        const query = {
            userId: user.id,
            query: "How is the 45 Ocean Drive deal looking? Any risks?"
        };

        console.log(`\n--- Processing Query: "${query.query}" ---`);
        const response = await askZenaService.processQuery(query);

        console.log('\n✅ ZENA RESPONSE:');
        console.log(response.answer);

        console.log('\n📊 SUGGESTED ACTIONS:');
        console.log(JSON.stringify(response.suggestedActions, null, 2));

        // Verification assertions
        const hasRiskDetection = response.answer.includes('London') || response.answer.toLowerCase().includes('2 weeks');
        const hasProactiveNudge = response.suggestedActions?.some(a =>
            a.toLowerCase().includes('price') || a.toLowerCase().includes('urgent') || a.toLowerCase().includes('call')
        );

        if (hasRiskDetection) {
            console.log('\n✅ SUCCESS: Zena detected the "hidden" London risk.');
        } else {
            console.error('\n❌ FAIL: Zena missed the deep context regarding London.');
        }

        if (hasProactiveNudge) {
            console.log('✅ SUCCESS: Zena provided a proactive nudge in suggestedActions.');
        } else {
            console.error('❌ FAIL: No relevant proactive nudge found in suggestedActions.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

verifyNudges();
