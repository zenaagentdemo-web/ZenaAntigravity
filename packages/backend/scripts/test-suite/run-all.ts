/**
 * Master Test Orchestrator
 * 
 * Runs all test suites sequentially with proper delays.
 * 
 * Run: npx tsx scripts/test-suite/run-all.ts
 */

import { spawn } from 'child_process';
import path from 'path';

const SUITE_DELAY_MS = 5000; // 5s between suites

interface SuiteResult {
    name: string;
    passed: boolean;
    duration: number;
}

const results: SuiteResult[] = [];

async function runSuite(name: string, script: string): Promise<SuiteResult> {
    const start = Date.now();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`▶️  Running: ${name}`);
    console.log(`${'═'.repeat(60)}\n`);

    return new Promise((resolve) => {
        const proc = spawn('npx', ['tsx', script], {
            cwd: path.resolve(import.meta.dirname, '../..'),
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            const passed = code === 0;
            resolve({
                name,
                passed,
                duration: Date.now() - start
            });
        });

        proc.on('error', (err) => {
            console.error(`Error running ${name}:`, err);
            resolve({
                name,
                passed: false,
                duration: Date.now() - start
            });
        });
    });
}

async function delay(ms: number): Promise<void> {
    console.log(`\n⏳ Cooldown between suites (${ms / 1000}s)...\n`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('\n🚀 MASTER TEST ORCHESTRATOR\n');
    console.log('═'.repeat(60));
    console.log('Running all test suites for Zena AI Agent Architecture');
    console.log('═'.repeat(60));

    // Suite 1: API Exhaustive (non-AI, fast)
    results.push(await runSuite('API Exhaustive Tests', 'scripts/test-suite/api-exhaustive.ts'));
    await delay(SUITE_DELAY_MS);

    // Suite 2: Property Intelligence (AI)
    results.push(await runSuite('Property AI Tests', 'scripts/test-suite/property-intelligence.ts'));
    await delay(SUITE_DELAY_MS);

    // Suite 3: Service Unit Tests (AI)
    results.push(await runSuite('Service Unit Tests', 'scripts/test-suite/service-unit-tests.ts'));
    await delay(SUITE_DELAY_MS);

    // Suite 4: Scenario Tests (AI, longest)
    results.push(await runSuite('Scenario Integration Tests', 'scripts/test-suite/scenario-tests.ts'));

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('═'.repeat(60) + '\n');

    let totalDuration = 0;
    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        const durationSec = Math.round(r.duration / 1000);
        console.log(`${icon} ${r.name} (${durationSec}s)`);
        totalDuration += r.duration;
    });

    const allPassed = results.every(r => r.passed);
    const passedCount = results.filter(r => r.passed).length;

    console.log(`\n📈 Suites: ${passedCount}/${results.length} passed`);
    console.log(`⏱️  Total Time: ${Math.round(totalDuration / 1000)}s`);

    if (allPassed) {
        console.log('\n🎉 ALL TEST SUITES PASSED!\n');
    } else {
        console.log('\n⚠️  SOME SUITES FAILED\n');
    }

    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
