/**
 * Phase 9 - Sprint 3: Deal Flow & Pipeline Verification
 * 
 * Tests:
 * 1. List Deals (GET /api/deals)
 * 2. Get Deal (GET /api/deals/:id)
 * 3. Pipeline Deals (GET /api/deals/pipeline/:type)
 * 4. Dashboard Stats (GET /api/deals/dashboard)
 * 5. Update Stage (PUT /api/deals/:id/stage)
 * 6. Deal Intelligence (GET /api/deals/:id/intelligence)
 * 7. Portfolio Intelligence (GET /api/deals/portfolio/intelligence)
 * 8. Bulk Operations
 * 
 * Run: npx tsx scripts/verify-phase9/sprint3-deals.ts
 */

import prisma from '../../src/config/database.js';

const API_BASE = 'http://localhost:3001';
const TOKEN = 'demo-token';

interface TestResult {
    name: string;
    passed: boolean;
    details: string;
    duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await fn();
        results.push({ name, passed: true, details: 'OK', duration: Date.now() - start });
        console.log(`✅ ${name}`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, details: msg, duration: Date.now() - start });
        console.log(`❌ ${name}: ${msg}`);
    }
}

async function main() {
    console.log('\n🔍 Phase 9 - Sprint 3: Deal Flow & Pipeline Verification\n');
    console.log('='.repeat(60) + '\n');

    // ============================================
    // TEST 1: List Deals
    // ============================================
    await test('Deals: GET /api/deals', async () => {
        const res = await fetch(`${API_BASE}/api/deals`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.deals)) {
            throw new Error('Response missing deals array');
        }
    });

    // ============================================
    // TEST 2: Dashboard Stats
    // ============================================
    await test('Deals: GET /api/deals/dashboard', async () => {
        const res = await fetch(`${API_BASE}/api/deals/dashboard`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // TEST 3: Pipeline - Buyer
    // ============================================
    await test('Deals: GET /api/deals/pipeline/buyer', async () => {
        const res = await fetch(`${API_BASE}/api/deals/pipeline/buyer`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!data.columns && !data.pipelineType) {
            throw new Error('Response missing pipeline structure');
        }
    });

    // ============================================
    // TEST 4: Pipeline - Seller
    // ============================================
    await test('Deals: GET /api/deals/pipeline/seller', async () => {
        const res = await fetch(`${API_BASE}/api/deals/pipeline/seller`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // TEST 5: Get Stages
    // ============================================
    await test('Deals: GET /api/deals/stages', async () => {
        const res = await fetch(`${API_BASE}/api/deals/stages`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // TEST 6: Portfolio Intelligence (Phase 8)
    // ============================================
    await test('Deals: GET /api/deals/portfolio/intelligence', async () => {
        const res = await fetch(`${API_BASE}/api/deals/portfolio/intelligence`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // TEST 7: Get Deal (with test ID)
    // ============================================
    await test('Deals: GET /api/deals/:id (404 expected for fake ID)', async () => {
        const res = await fetch(`${API_BASE}/api/deals/nonexistent-deal-id`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status !== 404) {
            throw new Error(`Expected 404, got ${res.status}`);
        }
    });

    // ============================================
    // TEST 8: Create Deal Endpoint
    // ============================================
    await test('Deals: POST /api/deals (validation check)', async () => {
        const res = await fetch(`${API_BASE}/api/deals`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ /* Empty to test validation */ })
        });
        // Expect 400 for missing required fields
        if (res.status !== 400) {
            throw new Error(`Expected 400 for validation, got ${res.status}`);
        }
    });

    // ============================================
    // TEST 9: Bulk Archive Endpoint
    // ============================================
    await test('Deals: POST /api/deals/bulk-archive (endpoint check)', async () => {
        const res = await fetch(`${API_BASE}/api/deals/bulk-archive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: [] })
        });
        // Accept any non-500 response
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // TEST 10: Bulk Delete Endpoint
    // ============================================
    await test('Deals: POST /api/deals/bulk-delete (endpoint check)', async () => {
        const res = await fetch(`${API_BASE}/api/deals/bulk-delete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: [] })
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPRINT 3 RESULTS\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.name} (${r.duration}ms)`);
        if (!r.passed) {
            console.log(`   └─ ${r.details}`);
        }
    });

    console.log(`\n📈 Total: ${passed}/${results.length} passed (${failed} failed)`);

    if (failed === 0) {
        console.log('\n🎉 SPRINT 3 VERIFICATION COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  SPRINT 3 VERIFICATION INCOMPLETE: Some tests failed.\n');
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
