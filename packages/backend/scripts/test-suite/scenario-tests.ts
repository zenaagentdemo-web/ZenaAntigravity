/**
 * Test Suite 4: Scenario-Based Integration Tests
 * 
 * 5 realistic end-to-end scenarios with rate-limited AI calls.
 * 
 * Scenarios:
 * 1. New Listing Workflow
 * 2. Buyer Journey
 * 3. Deal Progression
 * 4. Multi-Deal Strategy (Selling-to-Buy)
 * 5. God Mode Autonomous Actions
 * 
 * Run: npx tsx scripts/test-suite/scenario-tests.ts
 */

import prisma from '../../src/config/database.js';

const API_BASE = 'http://localhost:3001';
const TOKEN = 'demo-token';
const DELAY_BETWEEN_AI_CALLS_MS = 2500; // Slightly longer for scenarios

interface ScenarioResult {
    scenario: string;
    steps: { name: string; passed: boolean; details: string; duration: number }[];
    totalDuration: number;
}

const scenarioResults: ScenarioResult[] = [];

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function step(name: string, fn: () => Promise<any>): Promise<{ passed: boolean; details: string; duration: number; result?: any }> {
    const start = Date.now();
    try {
        const result = await fn();
        console.log(`   ✅ ${name} (${Date.now() - start}ms)`);
        return { passed: true, details: 'OK', duration: Date.now() - start, result };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ ${name}: ${msg}`);
        return { passed: false, details: msg, duration: Date.now() - start };
    }
}

async function getTestUserId(): Promise<string> {
    const user = await prisma.user.findFirst({ where: { email: 'demo@zena.ai' } });
    if (!user) throw new Error('Demo user not found');
    return user.id;
}

// ============================================
// SCENARIO 1: NEW LISTING WORKFLOW
// ============================================
async function scenario1_NewListingWorkflow(): Promise<ScenarioResult> {
    console.log('\n📋 SCENARIO 1: New Listing Workflow\n');
    console.log('   Flow: Create Property → Generate Intelligence → Match Buyers\n');

    const steps: ScenarioResult['steps'] = [];
    const start = Date.now();

    // Step 1: Get existing properties
    const s1 = await step('Fetch existing properties', async () => {
        const res = await fetch(`${API_BASE}/api/properties`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Fetch existing properties', ...s1 });

    // Step 2: Get property intelligence (AI)
    if (s1.result?.properties?.length > 0) {
        const propertyId = s1.result.properties[0].id;
        console.log('   ⏳ AI call with rate limit...');

        const s2 = await step('Generate property intelligence [AI]', async () => {
            const res = await fetch(`${API_BASE}/api/properties/${propertyId}/intelligence`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return res.json();
        });
        steps.push({ name: 'Generate property intelligence [AI]', ...s2 });

        await delay(DELAY_BETWEEN_AI_CALLS_MS);

        // Step 3: Search for matching buyers (AI)
        const s3 = await step('Search for matching buyers [AI]', async () => {
            const res = await fetch(`${API_BASE}/api/ask/contact-search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: 'buyers interested in family homes' })
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return res.json();
        });
        steps.push({ name: 'Search for matching buyers [AI]', ...s3 });

        await delay(DELAY_BETWEEN_AI_CALLS_MS);
    }

    return {
        scenario: 'New Listing Workflow',
        steps,
        totalDuration: Date.now() - start
    };
}

// ============================================
// SCENARIO 2: BUYER JOURNEY
// ============================================
async function scenario2_BuyerJourney(): Promise<ScenarioResult> {
    console.log('\n📋 SCENARIO 2: Buyer Journey\n');
    console.log('   Flow: Get Contact → Search Properties → Generate Portfolio Brief\n');

    const steps: ScenarioResult['steps'] = [];
    const start = Date.now();

    // Step 1: Get existing contacts
    const s1 = await step('Fetch contacts', async () => {
        const res = await fetch(`${API_BASE}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Fetch contacts', ...s1 });

    // Step 2: Property search (AI)
    console.log('   ⏳ AI call with rate limit...');
    const s2 = await step('Smart property search [AI]', async () => {
        const res = await fetch(`${API_BASE}/api/ask/property-search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'houses with 3 bedrooms near good schools' })
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Smart property search [AI]', ...s2 });

    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    // Step 3: Contact intelligence (AI)
    if (s1.result?.contacts?.length > 0) {
        const contactId = s1.result.contacts[0].id;
        const s3 = await step('Generate contact intelligence [AI]', async () => {
            const res = await fetch(`${API_BASE}/api/contacts/${contactId}/intelligence`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return res.json();
        });
        steps.push({ name: 'Generate contact intelligence [AI]', ...s3 });
    }

    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    return {
        scenario: 'Buyer Journey',
        steps,
        totalDuration: Date.now() - start
    };
}

// ============================================
// SCENARIO 3: DEAL PROGRESSION
// ============================================
async function scenario3_DealProgression(): Promise<ScenarioResult> {
    console.log('\n📋 SCENARIO 3: Deal Progression\n');
    console.log('   Flow: Get Deals → View Pipeline → Portfolio Intelligence\n');

    const steps: ScenarioResult['steps'] = [];
    const start = Date.now();

    // Step 1: Get deals
    const s1 = await step('Fetch deals', async () => {
        const res = await fetch(`${API_BASE}/api/deals`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Fetch deals', ...s1 });

    // Step 2: Get pipeline view
    const s2 = await step('Get buyer pipeline', async () => {
        const res = await fetch(`${API_BASE}/api/deals/pipeline/buyer`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Get buyer pipeline', ...s2 });

    // Step 3: Global portfolio intelligence (AI)
    console.log('   ⏳ AI call with rate limit...');
    const s3 = await step('Generate portfolio intelligence [AI]', async () => {
        const res = await fetch(`${API_BASE}/api/deals/portfolio/intelligence`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Generate portfolio intelligence [AI]', ...s3 });

    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    return {
        scenario: 'Deal Progression',
        steps,
        totalDuration: Date.now() - start
    };
}

// ============================================
// SCENARIO 4: MULTI-DEAL STRATEGY
// ============================================
async function scenario4_MultiDealStrategy(): Promise<ScenarioResult> {
    console.log('\n📋 SCENARIO 4: Multi-Deal Strategy (Selling-to-Buy)\n');
    console.log('   Flow: Find Contact with Deals → Analyze Dependencies → Strategic Brief\n');

    const steps: ScenarioResult['steps'] = [];
    const start = Date.now();
    const userId = await getTestUserId();

    // Step 1: Find contact with multiple deals
    const contactWithDeals = await prisma.contact.findFirst({
        where: { userId },
        include: { deals: true }
    });

    if (contactWithDeals) {
        steps.push({
            name: 'Found contact with deals',
            passed: true,
            details: `${contactWithDeals.name} - ${contactWithDeals.deals.length} deals`,
            duration: 10
        });
        console.log(`   ✅ Found contact: ${contactWithDeals.name}`);

        // Step 2: Portfolio analysis (AI)
        console.log('   ⏳ AI call with rate limit...');
        const s2 = await step('Analyze contact portfolio [AI]', async () => {
            const res = await fetch(`${API_BASE}/api/contacts/${contactWithDeals.id}/portfolio`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return res.json();
        });
        steps.push({ name: 'Analyze contact portfolio [AI]', ...s2 });

        await delay(DELAY_BETWEEN_AI_CALLS_MS);

        // Step 3: Contact intelligence (AI)
        const s3 = await step('Generate strategic brief [AI]', async () => {
            const res = await fetch(`${API_BASE}/api/contacts/${contactWithDeals.id}/intelligence`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return res.json();
        });
        steps.push({ name: 'Generate strategic brief [AI]', ...s3 });
    } else {
        steps.push({
            name: 'Find contact with deals',
            passed: false,
            details: 'No contact with deals found',
            duration: 10
        });
    }

    await delay(DELAY_BETWEEN_AI_CALLS_MS);

    return {
        scenario: 'Multi-Deal Strategy',
        steps,
        totalDuration: Date.now() - start
    };
}

// ============================================
// SCENARIO 5: GOD MODE AUTONOMOUS ACTIONS
// ============================================
async function scenario5_GodModeActions(): Promise<ScenarioResult> {
    console.log('\n📋 SCENARIO 5: God Mode Autonomous Actions\n');
    console.log('   Flow: Enable Demi-God → Heartbeat → Get Actions → History\n');

    const steps: ScenarioResult['steps'] = [];
    const start = Date.now();

    // Step 1: Get current settings
    const s1 = await step('Get god mode settings', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/settings`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Get god mode settings', ...s1 });

    // Step 2: Enable demi-god mode
    const s2 = await step('Enable demi-god mode', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mode: 'demi_god' })
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Enable demi-god mode', ...s2 });

    // Step 3: Trigger heartbeat
    const s3 = await step('Trigger heartbeat scan', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/heartbeat`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
    });
    steps.push({ name: 'Trigger heartbeat scan', ...s3 });

    // Step 4: Get pending actions
    const s4 = await step('Get pending actions', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/actions`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        console.log(`      📊 Found ${data.actions?.length || 0} pending actions`);
        return data;
    });
    steps.push({ name: 'Get pending actions', ...s4 });

    // Step 5: Get action history
    const s5 = await step('Get action history', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/history`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        console.log(`      📊 Found ${data.actions?.length || 0} historical actions`);
        return data;
    });
    steps.push({ name: 'Get action history', ...s5 });

    return {
        scenario: 'God Mode Autonomous Actions',
        steps,
        totalDuration: Date.now() - start
    };
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
    console.log('\n🎭 Test Suite 4: Scenario-Based Integration Tests\n');
    console.log('='.repeat(60));
    console.log('⏱️  Rate Limited: 2.5s delay between AI calls');
    console.log('📋 Running 5 realistic end-to-end scenarios\n');

    // Run scenarios sequentially with delays
    scenarioResults.push(await scenario1_NewListingWorkflow());
    console.log('   ⏳ Scenario cooldown (3s)...');
    await delay(3000);

    scenarioResults.push(await scenario2_BuyerJourney());
    console.log('   ⏳ Scenario cooldown (3s)...');
    await delay(3000);

    scenarioResults.push(await scenario3_DealProgression());
    console.log('   ⏳ Scenario cooldown (3s)...');
    await delay(3000);

    scenarioResults.push(await scenario4_MultiDealStrategy());
    console.log('   ⏳ Scenario cooldown (3s)...');
    await delay(3000);

    scenarioResults.push(await scenario5_GodModeActions());

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCENARIO TEST RESULTS\n');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const scenario of scenarioResults) {
        const passed = scenario.steps.filter(s => s.passed).length;
        const failed = scenario.steps.filter(s => !s.passed).length;
        totalPassed += passed;
        totalFailed += failed;

        const icon = failed === 0 ? '✅' : '⚠️';
        console.log(`${icon} ${scenario.scenario}: ${passed}/${scenario.steps.length} (${Math.round(scenario.totalDuration / 1000)}s)`);

        scenario.steps.forEach(s => {
            const stepIcon = s.passed ? '  ✅' : '  ❌';
            console.log(`${stepIcon} ${s.name}`);
            if (!s.passed) {
                console.log(`      └─ ${s.details}`);
            }
        });
        console.log('');
    }

    console.log(`📈 Total: ${totalPassed}/${totalPassed + totalFailed} passed (${totalFailed} failed)`);

    if (totalFailed === 0) {
        console.log('\n🎉 ALL SCENARIOS COMPLETE: 100% pass rate!\n');
    } else {
        console.log('\n⚠️  SOME SCENARIOS HAD FAILURES\n');
    }

    await prisma.$disconnect();
    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);
