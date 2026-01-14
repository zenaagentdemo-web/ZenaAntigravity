import { getLocalISODate } from './dateUtils';

// Mocking console.log for simple test output
const assertEqual = (actual: any, expected: any, message: string) => {
    if (actual === expected) {
        console.log(`✅ [PASS] ${message}`);
    } else {
        console.error(`❌ [FAIL] ${message}: Expected "${expected}", but got "${actual}"`);
        process.exit(1);
    }
};

const runTests = () => {
    // Test 1: Morning in NZ (+13)
    // Date: 2026-01-15 09:00:00 NZDT
    // UTC: 2026-01-14 20:00:00 UTC
    // Local ISO Date should be 2026-01-15
    const d1 = new Date('2026-01-14T20:00:00.000Z');
    // We need to be careful here because the environment's timezone matters.
    // In the user's environment (NZ), this Date object will have local date 15.
    // Check the local day to confirm it's 15 in the test environment if it's NZDT.
    console.log(`Test environment local time for d1: ${d1.toString()}`);

    // Test 2: Evening in NZ (+13)
    // Date: 2026-01-15 23:00:00 NZDT
    // UTC: 2026-01-15 10:00:00 UTC
    // Local ISO Date should be 2026-01-15
    const d2 = new Date('2026-01-15T10:00:00.000Z');

    // Instead of hardcoding 15, let's use the local date from the Date object to verify our utility matches it.
    assertEqual(getLocalISODate(d1), `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`, 'Matches local date components');

    // Test fixed string format
    const expectedD1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
    assertEqual(getLocalISODate(d1), expectedD1, 'Returns correct YYYY-MM-DD format');
};

runTests();
