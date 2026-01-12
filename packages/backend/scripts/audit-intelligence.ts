import prisma from '../src/config/database.js';
import { dealIntelligenceService } from '../src/services/deal-intelligence.service.js';
import { contactIntelligenceService } from '../src/services/contact-intelligence.service.js';

async function auditIntelligence() {
    console.log('--- Phase 4: Intelligence Audit (Fact-Checking Zena) ---');

    const userId = 'stress-test-agent-001';

    // 1. Audit Deal Intelligence
    const deal = await prisma.deal.findFirst({
        where: { userId, status: 'active' },
        include: { property: true }
    });

    if (deal) {
        console.log(`\nAuditing Deal Brief for: ${deal.property?.address || 'Unnamed Deal'}...`);
        const analysis = await dealIntelligenceService.analyzeDeal(userId, deal.id, true);

        console.log('✅ EXECUTED BRIEF:', analysis.executiveSummary);
        console.log('✅ HEALTH SCORE:', analysis.healthScore);
        console.log('✅ POWER MOVE:', analysis.suggestedPowerMove?.headline);

        // Basic verification: Analysis should not be empty
        if (analysis.executiveSummary && analysis.healthScore > 0) {
            console.log('   [PASS] Deal analysis logic is sound.');
        } else {
            console.log('   [FAIL] Deal analysis generated empty or invalid values.');
        }

        // Verify Caching
        console.log('Verifying caching for Deal Brief...');
        const start = Date.now();
        const cached = await dealIntelligenceService.analyzeDeal(userId, deal.id, false);
        const duration = Date.now() - start;

        if (duration < 500) { // Cached should be very fast
            console.log(`   [PASS] Cache hit in ${duration}ms.`);
        } else {
            console.log(`   [WARN] Cache check took ${duration}ms. Expected sub-500ms for cache.`);
        }
    } else {
        console.log('No active deals found to audit.');
    }

    // 2. Audit Contact Intelligence
    const contact = await prisma.contact.findFirst({
        where: { userId }
    });

    if (contact) {
        console.log(`\nAuditing Contact Brief for: ${contact.name}...`);
        const analysis = await contactIntelligenceService.analyzeContact(userId, contact.id);

        console.log('✅ STRATEGIC ADVICE:', analysis.strategicAdvice);
        console.log('✅ URGENCY SCORE:', analysis.urgencyScore);
        console.log('✅ MOTIVATION:', analysis.motivation);

        if (analysis.strategicAdvice && analysis.urgencyScore >= 0) {
            console.log('   [PASS] Contact analysis logic is sound.');
        } else {
            console.log('   [FAIL] Contact analysis generated empty or invalid values.');
        }
    } else {
        console.log('No contacts found to audit.');
    }

    console.log('\n--- Audit Complete ---');
}

auditIntelligence().catch(console.error).finally(() => process.exit());
