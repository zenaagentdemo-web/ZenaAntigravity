/**
 * Phase 9 - Sprint 1: Global Utilities Verification
 * 
 * Tests:
 * 1. Auth Endpoints (login, refresh, logout)
 * 2. User Profile (/api/auth/me)
 * 3. God Mode Status & Pending Actions
 * 
 * Run: npx tsx scripts/verify-phase9/sprint1-global.ts
 */

import prisma from '../../src/config/database.js';

const API_BASE = 'http://localhost:3001';

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

async function getTestUser(): Promise<{ userId: string; token: string }> {
    // Find or create a demo user (matches auth middleware's demo-token lookup)
    let user = await prisma.user.findFirst({ where: { email: 'demo@zena.ai' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'demo@zena.ai',
                name: 'Demo User',
                passwordHash: 'demo-hash',
            }
        });
        console.log(`📌 Created demo user: ${user.id}`);
    }

    // Use demo-token which is accepted by auth middleware in dev mode
    return { userId: user.id, token: 'demo-token' };
}

async function main() {
    console.log('\n🔍 Phase 9 - Sprint 1: Global Utilities Verification\n');
    console.log('='.repeat(60));

    const { userId, token } = await getTestUser();
    console.log(`\n📋 Test User: ${userId}\n`);

    // ============================================
    // TEST 1: Auth - Login Endpoint Structure
    // ============================================
    await test('Auth: Login endpoint exists', async () => {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'invalid@test.com', password: 'wrong' })
        });
        // We expect 401 for bad credentials, which proves the endpoint exists
        if (res.status !== 401 && res.status !== 400) {
            throw new Error(`Unexpected status: ${res.status}`);
        }
    });

    // ============================================
    // TEST 2: Auth - Refresh Token Endpoint
    // ============================================
    await test('Auth: Refresh endpoint exists', async () => {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: 'invalid-token' })
        });
        // Expect 401 for invalid token
        if (res.status !== 401 && res.status !== 400) {
            throw new Error(`Unexpected status: ${res.status}`);
        }
    });

    // ============================================
    // TEST 3: User Profile - /api/auth/me
    // ============================================
    await test('User Profile: GET /api/auth/me with valid token', async () => {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
        const data = await res.json();
        if (!data.user || !data.user.id) {
            throw new Error('Response missing user object');
        }
    });

    await test('User Profile: GET /api/auth/me without token returns 401', async () => {
        const res = await fetch(`${API_BASE}/api/auth/me`);
        if (res.status !== 401) {
            throw new Error(`Expected 401, got ${res.status}`);
        }
    });

    // ============================================
    // TEST 4: Pending Actions - /api/godmode/actions
    // ============================================
    await test('Pending Actions: GET /api/godmode/actions', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/actions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data.actions)) {
            throw new Error('Response missing actions array');
        }
    });

    // ============================================
    // TEST 5: God Mode Settings - /api/godmode/settings
    // ============================================
    await test('God Mode: GET /api/godmode/settings', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
        const data = await res.json();
        if (!data.mode) {
            throw new Error('Response missing mode field');
        }
    });

    // ============================================
    // TEST 6: God Mode Update - PUT /api/godmode/settings
    // ============================================
    await test('God Mode: PUT /api/godmode/settings (update)', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mode: 'demi_god' })
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
    });

    // ============================================
    // TEST 7: Heartbeat - POST /api/godmode/heartbeat
    // ============================================
    await test('Heartbeat: POST /api/godmode/heartbeat', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/heartbeat`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPRINT 1 RESULTS\n');

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
        console.log('\n🎉 SPRINT 1 VERIFICATION COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  SPRINT 1 VERIFICATION INCOMPLETE: Some tests failed.\n');
    }

    // Cleanup
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
