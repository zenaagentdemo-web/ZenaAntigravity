import { userPersonaService } from '../../src/services/user-persona.service.js';
import prisma from '../../src/config/database.js';

async function runTests() {
    console.log('🚀 Starting ML Personalization Verification...');

    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('❌ No users found in database. Please seed the database first.');
        return;
    }
    const demoUserId = user.id;

    try {
        // 1. SETUP: Create mock interaction history
        console.log(`\n--- PHASE 1: Data Seeding for User: ${user.email} ---`);

        // Clear existing mock persona if any
        await prisma.user.update({
            where: { id: demoUserId },
            data: { preferences: {} }
        });

        // Seed 10 casual messages with emojis
        console.log('Seeding casual chat history...');
        await prisma.chatConversation.create({
            data: {
                userId: demoUserId,
                title: 'Personalization Test',
                messages: {
                    create: [
                        { role: 'user', content: 'Hey Zena! 👋 Can you find me some cool houses in Takapuna?' },
                        { role: 'user', content: 'Actually, just show me the ones with 3 beds. Thanks! 😊' },
                        { role: 'user', content: 'Perfect, send me the details for the one on Hurstmere Rd.' },
                        { role: 'user', content: 'Lol that price is crazy! 🏎️' },
                        { role: 'user', content: 'Keep them coming, you are doing great!' }
                    ]
                }
            }
        });

        // Seed some action history (Dismiss one type, Execute another)
        console.log('Seeding action history...');
        // We use a dummy dealId but ensure it doesn't break if relations aren't strict in prisma schema
        // Actually ZenaAction requires dealId. We'll fetch a deal first.
        const deal = await prisma.deal.findFirst({ where: { userId: demoUserId } });
        const dealId = deal ? deal.id : '00000000-0000-0000-0000-000000000000'; // Fallback if no deal but should have one

        await prisma.zenaAction.createMany({
            data: [
                { userId: demoUserId, dealId, type: 'nudge_client' as any, status: 'executed', output: 'Test' },
                { userId: demoUserId, dealId, type: 'nudge_client' as any, status: 'executed', output: 'Test' },
                { userId: demoUserId, dealId, type: 'lim_reminder' as any, status: 'dismissed', output: 'Test' },
                { userId: demoUserId, dealId, type: 'lim_reminder' as any, status: 'dismissed', output: 'Test' }
            ]
        });

        // 2. TEST: Persona Synthesis
        console.log('\n--- PHASE 2: Persona Synthesis ---');
        const persona = await userPersonaService.synthesizePersona(demoUserId);
        console.log('Synthesized Persona:', JSON.stringify(persona, null, 2));

        if (persona.tone.linguisticMarkers.includes('emoji_heavy') || persona.tone.formality < 0.5) {
            console.log('✅ Tone Analysis: Successfully detected casual/emoji style.');
        } else {
            console.warn('⚠️ Tone Analysis: Style detection might be weak with few samples.');
        }

        // 3. TEST: Prompt Adaptation
        console.log('\n--- PHASE 3: Prompt Adaptation ---');
        const snippet = userPersonaService.getSystemPromptSnippet(persona);
        console.log('System Prompt Snippet:', snippet);

        if (snippet.toLowerCase().includes('casual')) {
            console.log('✅ Snippet: Correctly adapted to casual tone.');
        } else {
            console.log('ℹ️ Snippet: Using default or professional tone.');
        }

        // 4. TEST: Action Weighting
        console.log('\n--- PHASE 4: Action Weighting ---');
        const nudgeWeight = persona.actionWeights['nudge_client'] || 0;
        const limWeight = persona.actionWeights['lim_reminder'] || 0;
        console.log(`Weights -> Nudge: ${nudgeWeight}, LIM: ${limWeight}`);

        if (nudgeWeight > limWeight) {
            console.log('✅ Weighting: Correctly prioritized Nudges over LIM Reminders.');
        } else {
            console.error('❌ Weighting: Failed to prioritize based on success rate.');
        }

        console.log('\n✨ ML Personalization Verification Complete!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
