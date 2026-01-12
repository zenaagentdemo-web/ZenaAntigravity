/**
 * Test Suite 1: Property AI Agent Tests
 * 
 * Tests property-related intelligence endpoints with rate limiting.
 * 
 * Run: npx tsx scripts/test-suite/property-intelligence.ts
 */

import prisma from '../../src/config/database.js';

const API_BASE = 'http://localhost:3001';
const TOKEN = 'demo-token';
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

async function getFirstProperty(): Promise<{ id: string; address: string } | null> {
    const res = await fetch(`${API_BASE}/api/properties`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    if (data.properties && data.properties.length > 0) {
        return { id: data.properties[0].id, address: data.properties[0].address };
    }
    return null;
}

async function main() {
    console.log('\n🏠 Test Suite 1: Property AI Agent Tests\n');
    console.log('='.repeat(60));
    console.log('⏱️  Rate Limited: 2s delay between AI calls\n');

    // ============================================
    // TEST 1: List Properties (baseline)
    // ============================================
    await test('Property: GET /api/properties (list)', async () => {
        const res = await fetch(`${API_BASE}/api/properties`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.properties)) {
            throw new Error('Response missing properties array');
        }
        console.log(`   📊 Found ${data.properties.length} properties`);
    });

    // ============================================
    // TEST 2: Property Stats
    // ============================================
    await test('Property: GET /api/properties/stats', async () => {
        const res = await fetch(`${API_BASE}/api/properties/stats`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // Get a real property for AI tests
    const property = await getFirstProperty();
    if (!property) {
        console.log('\n⚠️  No properties found - skipping AI tests\n');
    } else {
        console.log(`\n🔍 Testing with property: ${property.address}\n`);

        // ============================================
        // TEST 3: Property Intelligence (AI)
        // ============================================
        await test('Property: GET /api/properties/:id/intelligence [AI]', async () => {
            console.log('   ⏳ Calling Gemini AI...');
            const res = await fetch(`${API_BASE}/api/properties/${property.id}/intelligence`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const data = await res.json();
            if (!data.intelligence) {
                throw new Error('Response missing intelligence field');
            }
            console.log(`   🧠 AI responded with ${JSON.stringify(data.intelligence).length} chars`);
        });

        // Rate limit delay
        console.log('   ⏳ Rate limit delay (2s)...');
        await delay(DELAY_BETWEEN_AI_CALLS_MS);

        // ============================================
        // TEST 4: Property Milestones
        // ============================================
        await test('Property: GET /api/properties/:id/milestones', async () => {
            const res = await fetch(`${API_BASE}/api/properties/${property.id}/milestones`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
        });

        // ============================================
        // TEST 5: Smart Property Search (AI)
        // ============================================
        await test('Property: POST /api/ask/property-search [AI]', async () => {
            console.log('   ⏳ Calling Gemini AI...');
            const res = await fetch(`${API_BASE}/api/ask/property-search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: 'properties in Parnell under 2 million' })
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const data = await res.json();
            console.log(`   🧠 AI parsed query, found ${data.results?.length || 0} matches`);
        });

        // Rate limit delay
        console.log('   ⏳ Rate limit delay (2s)...');
        await delay(DELAY_BETWEEN_AI_CALLS_MS);

        // ============================================
        // TEST 6: Ask Zena with Property Context (AI)
        // ============================================
        await test('Property: POST /api/ask with property context [AI]', async () => {
            console.log('   ⏳ Calling Gemini AI...');
            const res = await fetch(`${API_BASE}/api/ask`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `What should I do next for ${property.address}?`,
                    context: { propertyId: property.id }
                })
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const data = await res.json();
            console.log(`   🧠 Zena responded with ${data.response?.length || 0} chars`);
        });
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 PROPERTY AI TEST RESULTS\n');

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
        console.log('\n🎉 PROPERTY AI TESTS COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  PROPERTY AI TESTS INCOMPLETE: Some tests failed.\n');
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
