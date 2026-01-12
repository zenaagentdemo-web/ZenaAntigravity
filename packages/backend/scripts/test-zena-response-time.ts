/**
 * Test script for Zena Response Time Performance
 * 
 * Verifies that simple update operations complete in under 3 seconds
 * and creation operations don't hang indefinitely.
 * 
 * Run with: npx tsx scripts/test-zena-response-time.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Simulate the orchestrator's performance checks
async function testPerformance() {
    console.log('🔬 Zena Response Time Performance Test');
    console.log('=======================================\n');

    // Import the services
    const { proactiveContextService } = await import('../src/services/proactive-context.service.js');

    const testUserId = 'test-user-123';

    // Test 1: Proactive scan with data already provided (should skip web search)
    console.log('📋 Test 1: Proactive scan WITH existing data (should skip web search)');
    console.log('-------------------------------------------------------------------');
    const startTest1 = Date.now();

    await proactiveContextService.scanForContext(testUserId, 'create', 'property', {
        address: '48 Woodward Street, Taupo',
        bedrooms: 5,  // Already have data - should skip web search
        bathrooms: 2
    });

    const durationTest1 = Date.now() - startTest1;
    const passTest1 = durationTest1 < 3000;
    console.log(`⏱️  Duration: ${durationTest1}ms`);
    console.log(`${passTest1 ? '✅ PASS' : '❌ FAIL'}: ${passTest1 ? 'Completed under 3s' : 'Too slow!'}\n`);

    // Test 2: Proactive scan WITHOUT data (may trigger web search but should be cached after)
    console.log('📋 Test 2: Proactive scan WITHOUT existing data (first call - may be slow)');
    console.log('-------------------------------------------------------------------');
    const startTest2 = Date.now();

    await proactiveContextService.scanForContext(testUserId, 'create', 'property', {
        address: '123 Test Street, Auckland'
        // No bedrooms/bathrooms - will trigger web search
    });

    const durationTest2 = Date.now() - startTest2;
    // First call may be slow due to web search, but should timeout at 10s max
    const passTest2 = durationTest2 < 15000;
    console.log(`⏱️  Duration: ${durationTest2}ms`);
    console.log(`${passTest2 ? '✅ PASS' : '❌ FAIL'}: ${passTest2 ? 'Completed (timeout protection worked)' : 'No timeout protection!'}\n`);

    // Test 3: Same address again (should hit cache)
    console.log('📋 Test 3: Same address again (should hit cache - FAST)');
    console.log('-------------------------------------------------------------------');
    const startTest3 = Date.now();

    await proactiveContextService.scanForContext(testUserId, 'create', 'property', {
        address: '123 Test Street, Auckland'
    });

    const durationTest3 = Date.now() - startTest3;
    const passTest3 = durationTest3 < 500; // Cache hit should be <500ms
    console.log(`⏱️  Duration: ${durationTest3}ms`);
    console.log(`${passTest3 ? '✅ PASS' : '❌ FAIL'}: ${passTest3 ? 'Cache hit - super fast!' : 'Cache not working!'}\n`);

    // Test 4: Contact scan (should be fast - DB only)
    console.log('📋 Test 4: Contact scan (DB only - should be fast)');
    console.log('-------------------------------------------------------------------');
    const startTest4 = Date.now();

    await proactiveContextService.scanForContext(testUserId, 'create', 'contact', {
        name: 'John Smith',
        email: 'john@example.com'
    });

    const durationTest4 = Date.now() - startTest4;
    const passTest4 = durationTest4 < 1000;
    console.log(`⏱️  Duration: ${durationTest4}ms`);
    console.log(`${passTest4 ? '✅ PASS' : '❌ FAIL'}: ${passTest4 ? 'Fast DB query' : 'Too slow for DB query!'}\n`);

    // Summary
    console.log('📊 SUMMARY');
    console.log('==========');
    const allPassed = passTest1 && passTest2 && passTest3 && passTest4;
    const passCount = [passTest1, passTest2, passTest3, passTest4].filter(Boolean).length;
    console.log(`Tests Passed: ${passCount}/4`);

    if (passTest3) {
        console.log('✅ Cache is working correctly');
    }
    if (passTest1) {
        console.log('✅ Skip logic is working (data already provided)');
    }
    if (passTest2) {
        console.log('✅ Timeout protection is working');
    }

    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed'}`);

    process.exit(allPassed ? 0 : 1);
}

testPerformance().catch(console.error);
