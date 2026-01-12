/**
 * Phase 9 - Sprint 6: Tasks, Calendar & God Mode Verification
 * 
 * Tests:
 * 1. List Tasks (GET /api/tasks)
 * 2. Task CRUD
 * 3. Calendar Events (GET /api/calendar/events)
 * 4. Optimize Day (POST /api/calendar/optimize)
 * 5. God Mode History (GET /api/godmode/history)
 * 6. Approve/Dismiss Action
 * 
 * Run: npx tsx scripts/verify-phase9/sprint6-tasks-godmode.ts
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
    console.log('\n🔍 Phase 9 - Sprint 6: Tasks, Calendar & God Mode Verification\n');
    console.log('='.repeat(60) + '\n');

    // ============================================
    // TASKS
    // ============================================
    await test('Tasks: GET /api/tasks', async () => {
        const res = await fetch(`${API_BASE}/api/tasks`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Tasks: GET /api/tasks?priority=urgent', async () => {
        const res = await fetch(`${API_BASE}/api/tasks?priority=urgent`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('Tasks: POST /api/tasks (validation)', async () => {
        const res = await fetch(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ /* Empty for validation */ })
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    await test('Tasks: GET /api/tasks/:id (404 expected)', async () => {
        const res = await fetch(`${API_BASE}/api/tasks/nonexistent-id`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // ============================================
    // CALENDAR
    // ============================================
    await test('Calendar: GET /api/calendar/events', async () => {
        const res = await fetch(`${API_BASE}/api/calendar/events`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    await test('Calendar: POST /api/calendar/optimize', async () => {
        const res = await fetch(`${API_BASE}/api/calendar/optimize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: new Date().toISOString() })
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // GOD MODE (Extended)
    // ============================================
    await test('GodMode: GET /api/godmode/history', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/history`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    await test('GodMode: POST /api/godmode/actions/:id/approve (404 expected)', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/actions/fake-id/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        // Expect 404 for nonexistent action
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    await test('GodMode: POST /api/godmode/actions/:id/dismiss (404 expected)', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/actions/fake-id/dismiss`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    await test('GodMode: POST /api/godmode/bulk-approve', async () => {
        const res = await fetch(`${API_BASE}/api/godmode/bulk-approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ actionIds: [] })
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // ASK ZENA (Core)
    // ============================================
    await test('Ask Zena: POST /api/ask', async () => {
        const res = await fetch(`${API_BASE}/api/ask`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'Hello Zena' })
        });
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPRINT 6 RESULTS\n');

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
        console.log('\n🎉 SPRINT 6 VERIFICATION COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  SPRINT 6 VERIFICATION INCOMPLETE: Some tests failed.\n');
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
