/**
 * Test Suite 2: API Exhaustive Tests
 * 
 * Comprehensive coverage of all REST endpoints.
 * Non-AI endpoints tested without rate limiting.
 * 
 * Run: npx tsx scripts/test-suite/api-exhaustive.ts
 */

import prisma from '../../src/config/database.js';

const API_BASE = 'http://localhost:3001';
const TOKEN = 'demo-token';

interface TestResult {
    category: string;
    name: string;
    passed: boolean;
    details: string;
    duration: number;
}

const results: TestResult[] = [];

async function test(category: string, name: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await fn();
        results.push({ category, name, passed: true, details: 'OK', duration: Date.now() - start });
        console.log(`   ✅ ${name}`);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ category, name, passed: false, details: msg, duration: Date.now() - start });
        console.log(`   ❌ ${name}: ${msg}`);
    }
}

async function main() {
    console.log('\n📡 Test Suite 2: API Exhaustive Tests\n');
    console.log('='.repeat(60) + '\n');

    // ============================================
    // AUTH ENDPOINTS
    // ============================================
    console.log('--- Auth Endpoints ---');

    await test('Auth', 'POST /api/auth/login (invalid creds)', async () => {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
        });
        if (res.status !== 401 && res.status !== 400) throw new Error(`Status: ${res.status}`);
    });

    await test('Auth', 'POST /api/auth/refresh (invalid token)', async () => {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: 'invalid' })
        });
        if (res.status !== 401 && res.status !== 400) throw new Error(`Status: ${res.status}`);
    });

    await test('Auth', 'GET /api/auth/me', async () => {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // DEALS ENDPOINTS
    // ============================================
    console.log('\n--- Deals Endpoints ---');

    await test('Deals', 'GET /api/deals', async () => {
        const res = await fetch(`${API_BASE}/api/deals`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Deals', 'GET /api/deals/dashboard', async () => {
        const res = await fetch(`${API_BASE}/api/deals/dashboard`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Deals', 'GET /api/deals/pipeline/buyer', async () => {
        const res = await fetch(`${API_BASE}/api/deals/pipeline/buyer`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Deals', 'GET /api/deals/pipeline/seller', async () => {
        const res = await fetch(`${API_BASE}/api/deals/pipeline/seller`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Deals', 'GET /api/deals/stages', async () => {
        const res = await fetch(`${API_BASE}/api/deals/stages`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Deals', 'POST /api/deals/bulk-archive', async () => {
        const res = await fetch(`${API_BASE}/api/deals/bulk-archive`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [] })
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // PROPERTIES ENDPOINTS
    // ============================================
    console.log('\n--- Properties Endpoints ---');

    await test('Properties', 'GET /api/properties', async () => {
        const res = await fetch(`${API_BASE}/api/properties`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Properties', 'GET /api/properties/stats', async () => {
        const res = await fetch(`${API_BASE}/api/properties/stats`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    await test('Properties', 'POST /api/properties (validation)', async () => {
        const res = await fetch(`${API_BASE}/api/properties`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    await test('Properties', 'POST /api/properties/bulk-delete', async () => {
        const res = await fetch(`${API_BASE}/api/properties/bulk-delete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [] })
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // CONTACTS ENDPOINTS
    // ============================================
    console.log('\n--- Contacts Endpoints ---');

    await test('Contacts', 'GET /api/contacts', async () => {
        const res = await fetch(`${API_BASE}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Contacts', 'GET /api/contacts?role=buyer', async () => {
        const res = await fetch(`${API_BASE}/api/contacts?role=buyer`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Contacts', 'POST /api/contacts (validation)', async () => {
        const res = await fetch(`${API_BASE}/api/contacts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // TASKS ENDPOINTS
    // ============================================
    console.log('\n--- Tasks Endpoints ---');

    await test('Tasks', 'GET /api/tasks', async () => {
        const res = await fetch(`${API_BASE}/api/tasks`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Tasks', 'GET /api/tasks?priority=urgent', async () => {
        const res = await fetch(`${API_BASE}/api/tasks?priority=urgent`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // CALENDAR ENDPOINTS
    // ============================================
    console.log('\n--- Calendar Endpoints ---');

    await test('Calendar', 'GET /api/calendar/events', async () => {
        const res = await fetch(`${API_BASE}/api/calendar/events`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // THREADS ENDPOINTS
    // ============================================
    console.log('\n--- Threads Endpoints ---');

    await test('Threads', 'GET /api/threads', async () => {
        const res = await fetch(`${API_BASE}/api/threads`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Threads', 'GET /api/threads?category=focus', async () => {
        const res = await fetch(`${API_BASE}/api/threads?category=focus`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // GODMODE ENDPOINTS
    // ============================================
    console.log('\n--- GodMode Endpoints ---');

    await test('GodMode', 'GET /api/godmode/settings', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/settings`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('GodMode', 'GET /api/godmode/actions', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/actions`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('GodMode', 'GET /api/godmode/history', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/history`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('GodMode', 'POST /api/godmode/heartbeat', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/heartbeat`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // FOLDERS ENDPOINTS
    // ============================================
    console.log('\n--- Folders Endpoints ---');

    await test('Folders', 'GET /api/folders', async () => {
        const res = await fetch(`${API_BASE}/api/folders`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // VOICE NOTES ENDPOINTS
    // ============================================
    console.log('\n--- Voice Notes Endpoints ---');

    await test('VoiceNotes', 'GET /api/voicenotes', async () => {
        const res = await fetch(`${API_BASE}/api/voicenotes`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status >= 500) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 API EXHAUSTIVE TEST RESULTS\n');

    const categories = [...new Set(results.map(r => r.category))];

    for (const cat of categories) {
        const catResults = results.filter(r => r.category === cat);
        const passed = catResults.filter(r => r.passed).length;
        const icon = passed === catResults.length ? '✅' : '⚠️';
        console.log(`${icon} ${cat}: ${passed}/${catResults.length}`);
    }

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;

    console.log(`\n📈 Total: ${totalPassed}/${results.length} passed (${totalFailed} failed)`);

    if (totalFailed === 0) {
        console.log('\n🎉 API EXHAUSTIVE TESTS COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  API EXHAUSTIVE TESTS INCOMPLETE: Some tests failed.\n');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   ❌ ${r.category}/${r.name}: ${r.details}`);
        });
    }

    await prisma.$disconnect();
    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);
