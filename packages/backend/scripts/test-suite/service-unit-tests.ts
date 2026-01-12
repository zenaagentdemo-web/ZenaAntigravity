/**
 * Test Suite 3: Service Unit Tests
 * 
 * Direct testing of service methods (bypasses HTTP layer).
 * Tests core business logic with rate-limited AI calls.
 * 
 * Run: npx tsx scripts/test-suite/service-unit-tests.ts
 */

import prisma from '../../src/config/database.js';
import { askZenaService } from '../../src/services/ask-zena.service.js';
import { portfolioIntelligenceService } from '../../src/services/portfolio-intelligence.service.js';
import { godmodeService } from '../../src/services/godmode.service.js';

const DELAY_BETWEEN_AI_CALLS_MS = 2000;

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
    duration: number;
}

const results: TestResult[] = [];

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, details: 'OK', duration: Date.now() - start });
        console.log(`✅ ${name} (${Date.now() - start}ms)`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, details: msg, duration: Date.now() - start });
        console.log(`❌ ${name}: ${msg}`);
    }
}

async function getTestUserId(): Promise<string> {
    const user = await prisma.user.findFirst({ where: { email: 'demo@zena.ai' } });
    if (!user) throw new Error('Demo user not found');
    return user.id;
}

async function main() {
    console.log('\n🧪 Test Suite 3: Service Unit Tests\n');
    console.log('='.repeat(60));
    console.log('⏱️  Rate Limited: 2s delay between AI calls\n');

    const userId = await getTestUserId();
    console.log(`📋 Test User: ${userId}\n`);

    // ============================================
    // GODMODE SERVICE TESTS
    // ============================================
    console.log('--- GodMode Service ---\n');

    await test('GodmodeService.getSettings()', async () => {
        const settings = await godmodeService.getSettings(userId);
        if (!settings.mode) throw new Error('Settings missing mode field');
        console.log(`   📊 Mode: ${settings.mode}`);
    });

    await test('GodmodeService.updateSettings()', async () => {
        const settings = await godmodeService.updateSettings(userId, { mode: 'demi_god' });
        if (settings.mode !== 'demi_god') throw new Error('Mode not updated');
    });

    await test('GodmodeService.getPendingActions()', async () => {
        const actions = await godmodeService.getPendingActions(userId);
        console.log(`   📊 Found ${actions.length} pending actions`);
    });

    await test('GodmodeService.getActionHistory()', async () => {
        const history = await godmodeService.getActionHistory(userId, 10);
        console.log(`   📊 Found ${history.length} historical actions`);
    });

    // ============================================
    // PORTFOLIO INTELLIGENCE SERVICE TESTS
    // ============================================
    console.log('\n--- Portfolio Intelligence Service ---\n');

    // Get a contact with deals for portfolio analysis
    const contactWithDeals = await prisma.contact.findFirst({
        where: { userId, deals: { some: {} } },
        include: { deals: true }
    });

    if (contactWithDeals) {
        await test('PortfolioIntelligenceService.analyzePortfolio() [AI]', async () => {
            console.log('   ⏳ Calling Gemini AI...');
            const brief = await portfolioIntelligenceService.analyzePortfolio(userId, contactWithDeals.id);
            if (brief) {
                console.log(`   🧠 Strategy: ${brief.strategyType}`);
            } else {
                console.log('   📊 No multi-deal portfolio found');
            }
        });

        console.log('   ⏳ Rate limit delay (2s)...');
        await delay(DELAY_BETWEEN_AI_CALLS_MS);
    } else {
        console.log('   ⚠️  No contact with deals found - skipping portfolio test\n');
    }

    await test('PortfolioIntelligenceService.analyzeGlobalPortfolio() [AI]', async () => {
        console.log('   ⏳ Calling Gemini AI...');
        const global = await portfolioIntelligenceService.analyzeGlobalPortfolio(userId);
        console.log(`   🧠 Total Pipeline Value: $${global.totalPipelineValue?.toLocaleString() || 'N/A'}`);
    });

    console.log('   ⏳ Rate limit delay (2s)...');
    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    // ============================================
    // ASK ZENA SERVICE TESTS
    // ============================================
    console.log('\n--- Ask Zena Service ---\n');

    await test('AskZenaService.parseSearchQuery() [AI]', async () => {
        console.log('   ⏳ Calling Gemini AI...');
        const result = await askZenaService.parseSearchQuery('demo-user-id', 'show me properties in Ponsonby');
        // parseSearchQuery returns { role, category, dealStage, keywords, aiInsight }
        if (!result.role) throw new Error('Missing role field');
        console.log(`   🧠 Role: ${result.role}, Category: ${result.category}`);
    });

    console.log('   ⏳ Rate limit delay (2s)...');
    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    await test('AskZenaService.parsePropertySearchQuery() [AI]', async () => {
        console.log('   ⏳ Calling Gemini AI...');
        const result = await askZenaService.parsePropertySearchQuery('villas under 1.5 million');
        console.log(`   🧠 Filters parsed: ${Object.keys(result.filters || {}).length}`);
    });

    console.log('   ⏳ Rate limit delay (2s)...');
    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    // ============================================
    // SUMMARY - Intelligence tests skipped (no dedicated service)
    // ============================================

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SERVICE UNIT TEST RESULTS\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.name}`);
        if (!r.passed) {
            console.log(`   └─ ${r.details}`);
        }
    });

    console.log(`\n📈 Total: ${passed}/${results.length} passed (${failed} failed)`);

    if (failed === 0) {
        console.log('\n🎉 SERVICE UNIT TESTS COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  SERVICE UNIT TESTS INCOMPLETE: Some tests failed.\n');
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
