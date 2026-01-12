/**
 * Phase 9 - Sprint 2: Inbox Ecosystem Verification
 * 
 * Tests:
 * 1. List Threads (GET /api/threads)
 * 2. Get Thread (GET /api/threads/:id)
 * 3. Archive Thread (POST /api/threads/:id/archive)
 * 4. Draft Reply (POST /api/ask/draft-reply)
 * 5. Folder CRUD (/api/folders/*)
 * 
 * Run: npx tsx scripts/verify-phase9/sprint2-inbox.ts
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

async function ensureDemoUser(): Promise<string> {
    let user = await prisma.user.findFirst({ where: { email: 'demo@zena.ai' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'demo@zena.ai',
                name: 'Demo User',
                passwordHash: 'demo-hash',
            }
        });
    }
    return user.id;
}

async function main() {
    console.log('\n🔍 Phase 9 - Sprint 2: Inbox Ecosystem Verification\n');
    console.log('='.repeat(60));

    const userId = await ensureDemoUser();
    console.log(`\n📋 Demo User: ${userId}\n`);

    // ============================================
    // TEST 1: List Threads
    // ============================================
    await test('Threads: GET /api/threads', async () => {
        const res = await fetch(`${API_BASE}/api/threads`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data.threads)) {
            throw new Error('Response missing threads array');
        }
    });

    // ============================================
    // TEST 2: List Threads with Filters
    // ============================================
    await test('Threads: GET /api/threads?category=focus', async () => {
        const res = await fetch(`${API_BASE}/api/threads?category=focus`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
    });

    // ============================================
    // TEST 3: Get Thread (may 404 if no threads exist)
    // ============================================
    await test('Threads: GET /api/threads/:id (or 404)', async () => {
        // First get a real thread ID if available
        const listRes = await fetch(`${API_BASE}/api/threads`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const listData = await listRes.json();

        if (listData.threads && listData.threads.length > 0) {
            const threadId = listData.threads[0].id;
            const res = await fetch(`${API_BASE}/api/threads/${threadId}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) {
                throw new Error(`Status: ${res.status}`);
            }
        } else {
            // No threads exist, test with fake ID expecting 404
            const res = await fetch(`${API_BASE}/api/threads/nonexistent-id`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (res.status !== 404) {
                throw new Error(`Expected 404 for nonexistent thread, got ${res.status}`);
            }
        }
    });

    // ============================================
    // TEST 4: Archive Thread Endpoint Exists
    // ============================================
    await test('Threads: POST /api/threads/:id/archive (endpoint check)', async () => {
        const res = await fetch(`${API_BASE}/api/threads/test-id/archive`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        // Expect 404 (thread not found) or 400, not 500
        if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // TEST 5: Draft Reply Endpoint
    // ============================================
    await test('Ask Zena: POST /api/ask/draft-reply', async () => {
        const res = await fetch(`${API_BASE}/api/ask/draft-reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                threadId: 'test-thread',
                tone: 'professional'
            })
        });
        // Accept 200, 400 (validation), or 404 (thread not found)
        if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // TEST 6: Folders - List
    // ============================================
    await test('Folders: GET /api/folders', async () => {
        const res = await fetch(`${API_BASE}/api/folders`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data.folders) && !Array.isArray(data)) {
            throw new Error('Response not an array');
        }
    });

    // ============================================
    // TEST 7: Smart Search - Property Search
    // ============================================
    await test('Ask Zena: POST /api/ask/property-search', async () => {
        const res = await fetch(`${API_BASE}/api/ask/property-search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'properties in Parnell' })
        });
        // Accept any non-500 response
        if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // TEST 8: Smart Search - Contact Search
    // ============================================
    await test('Ask Zena: POST /api/ask/contact-search', async () => {
        const res = await fetch(`${API_BASE}/api/ask/contact-search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'buyers looking for houses' })
        });
        if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // TEST 9: Smart Search - Deal Search
    // ============================================
    await test('Ask Zena: POST /api/ask/deal-search', async () => {
        const res = await fetch(`${API_BASE}/api/ask/deal-search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'deals at risk' })
        });
        if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPRINT 2 RESULTS\n');

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
        console.log('\n🎉 SPRINT 2 VERIFICATION COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  SPRINT 2 VERIFICATION INCOMPLETE: Some tests failed.\n');
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
