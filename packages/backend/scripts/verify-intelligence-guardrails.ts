
import { contactIntelligenceService } from '../src/services/contact-intelligence.service';
import prisma from '../src/config/database';
import { randomUUID } from 'crypto';

async function main() {
    console.log('🧪 Starting Intelligence Guardrail Verification...');

    // 1. Create a "Ghost" Contact with ZERO context
    const ghostId = randomUUID();
    const userId = 'user_123'; // Assuming a test user exists or we can mock it. 
    // Wait, we need a real user ID or the service might fail on context retrieval if it checks DB.
    // Let's try to find a user first, or just create one if possible. 
    // For safety, let's assume we can query one.
    let user = await prisma.user.findFirst();
    if (!user) {
        console.log('⚠️ No existing user found. Creating temporary test user...');
        user = await prisma.user.create({
            data: {
                id: 'test-user-' + Date.now(),
                email: 'test-' + Date.now() + '@example.com',
                name: 'Test Agent',
                passwordHash: 'dummy_hash'
            }
        });
    }

    const contact = await prisma.contact.create({
        data: {
            id: ghostId,
            userId: user.id, // Correct reference to User.id
            name: 'Ghost Verify',
            emails: [`ghost-${Date.now()}@test.com`],
            role: 'buyer',
            intelligenceSnippet: '', // Empty
            relationshipNotes: [],   // Empty
        }
    });

    console.log(`👻 Created Ghost Contact: ${contact.id}`);

    try {
        // 2. Trigger Analysis
        console.log('🧠 Triggering Intelligence Analysis...');
        const analysis = await contactIntelligenceService.analyzeContact(user.id, ghostId);

        console.log('\n📊 ANALYSIS RESULT:');
        console.log(JSON.stringify(analysis, null, 2));

        // 3. Verification Checks
        const isMock = analysis.motivation.includes('Larger family home') || analysis.motivation.includes('market peak');
        const isClean = analysis.motivation.includes('Insufficient data') || analysis.motivation === 'Unknown';

        if (isMock) {
            console.error('\n❌ FAIL: Service returned MOCK or HALLUCINATED data!');
            console.error('   Expected: "Insufficient data"');
            console.error(`   Received: "${analysis.motivation}"`);
        } else if (isClean) {
            console.log('\n✅ PASS: Service correctly identified insufficient data.');
        } else {
            console.warn('\n⚠️ UNCERTAIN: Result is neither known mock nor explicit insufficient data. Check manually.');
        }

    } catch (error) {
        console.error('❌ Error during analysis:', error);
    } finally {
        // Cleanup
        await prisma.contact.delete({ where: { id: ghostId } });
        console.log('🧹 Cleanup complete.');
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
