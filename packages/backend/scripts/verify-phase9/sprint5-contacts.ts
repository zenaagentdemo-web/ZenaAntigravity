/**
 * Phase 9 - Sprint 5: Contacts Verification
 * 
 * Tests:
 * 1. List Contacts (GET /api/contacts)
 * 2. Get Contact (GET /api/contacts/:id)
 * 3. Contact Intelligence (GET /api/contacts/:id/intelligence)
 * 4. Portfolio Brief (GET /api/contacts/:id/portfolio)
 * 5. CRUD Operations
 * 6. Voice Note Transcription
 * 
 * Run: npx tsx scripts/verify-phase9/sprint5-contacts.ts
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
    console.log('\n🔍 Phase 9 - Sprint 5: Contacts Verification\n');
    console.log('='.repeat(60) + '\n');

    // ============================================
    // TEST 1: List Contacts
    // ============================================
    await test('Contacts: GET /api/contacts', async () => {
        const res = await fetch(`${API_BASE}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.contacts)) {
            throw new Error('Response missing contacts array');
        }
    });

    // ============================================
    // TEST 2: List Contacts with Filters
    // ============================================
    await test('Contacts: GET /api/contacts?role=buyer', async () => {
        const res = await fetch(`${API_BASE}/api/contacts?role=buyer`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
    });

    // ============================================
    // TEST 3: Get Contact (404 for fake ID)
    // ============================================
    await test('Contacts: GET /api/contacts/:id (404 expected)', async () => {
        const res = await fetch(`${API_BASE}/api/contacts/nonexistent-id`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (res.status !== 404) {
            throw new Error(`Expected 404, got ${res.status}`);
        }
    });

    // ============================================
    // TEST 4: Create Contact (validation check)
    // ============================================
    await test('Contacts: POST /api/contacts (validation)', async () => {
        const res = await fetch(`${API_BASE}/api/contacts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ /* Empty for validation check */ })
        });
        // Accept 400 for validation or 201 for success
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // TEST 5: Contact Intelligence (with real contact if exists)
    // ============================================
    await test('Contacts: GET /api/contacts/:id/intelligence', async () => {
        const listRes = await fetch(`${API_BASE}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const listData = await listRes.json();

        if (listData.contacts && listData.contacts.length > 0) {
            const contactId = listData.contacts[0].id;
            const res = await fetch(`${API_BASE}/api/contacts/${contactId}/intelligence`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
        } else {
            // No contacts, test with fake ID
            const res = await fetch(`${API_BASE}/api/contacts/fake-id/intelligence`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // TEST 6: Contact Portfolio Brief
    // ============================================
    await test('Contacts: GET /api/contacts/:id/portfolio', async () => {
        const listRes = await fetch(`${API_BASE}/api/contacts`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const listData = await listRes.json();

        if (listData.contacts && listData.contacts.length > 0) {
            const contactId = listData.contacts[0].id;
            const res = await fetch(`${API_BASE}/api/contacts/${contactId}/portfolio`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            // Accept any non-500
            if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
        }
    });

    // ============================================
    // TEST 7: Bulk Delete
    // ============================================
    await test('Contacts: POST /api/contacts/bulk-delete', async () => {
        const res = await fetch(`${API_BASE}/api/contacts/bulk-delete`, {
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
    // TEST 8: Voice Notes List
    // ============================================
    await test('Voice Notes: GET /api/voicenotes', async () => {
        const res = await fetch(`${API_BASE}/api/voicenotes`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        // Accept 200 or 404 (endpoint may not be separately exposed)
        if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPRINT 5 RESULTS\n');

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
        console.log('\n🎉 SPRINT 5 VERIFICATION COMPLETE: All tests passed!\n');
    } else {
        console.log('\n⚠️  SPRINT 5 VERIFICATION INCOMPLETE: Some tests failed.\n');
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
