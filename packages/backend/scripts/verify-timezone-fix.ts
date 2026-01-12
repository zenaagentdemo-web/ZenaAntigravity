#!/usr/bin/env tsx

import { agentOrchestrator } from '../src/services/agent-orchestrator.service.js';
import { sessionManager } from '../src/services/session-manager.service.js';
import { getNZDateTime } from '../src/utils/date-utils.js';

async function verify() {
    const userId = 'test-user-' + Date.now();
    const nz = getNZDateTime();

    console.log('--- SYSTEM DATE CONTEXT ---');
    console.log('NZ Time:', nz.full);
    console.log('NZ Date:', nz.date);
    console.log('---------------------------\n');

    const query = "What is today's date and what would tomorrow's date be?";
    console.log(`💬 USER: ${query}`);

    const response = await agentOrchestrator.processQuery(userId, query);

    console.log(`🤖 ZENA: ${response.answer}`);

    const includesDate = response.answer.includes('12') && response.answer.toLowerCase().includes('january') && response.answer.includes('2026');
    const includesTomorrow = response.answer.includes('13');

    if (includesDate && includesTomorrow) {
        console.log('\n✅ VERIFICATION SUCCESSFUL: Zena correctly identified today and tomorrow.');
    } else {
        console.log('\n❌ VERIFICATION FAILED: Zena might be using the wrong date context.');
        process.exit(1);
    }
}

verify().catch(console.error);
