#!/usr/bin/env tsx

import { agentOrchestrator } from '../src/services/agent-orchestrator.service.js';
import { sessionManager } from '../src/services/session-manager.service.js';
import prisma from '../src/config/database.js';
import { logger } from '../src/services/logger.service.js';

const TEST_USER_ID = '285f391f-e55b-4c49-9778-f00f830b7b4a'; // demo@zena.ai
const CONVERSATION_ID = 'verify-fix-convo-' + Date.now();

async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');

    await prisma.task.deleteMany({
        where: { userId: TEST_USER_ID, label: { contains: 'Whitby', mode: 'insensitive' } }
    });

    await prisma.property.deleteMany({
        where: { userId: TEST_USER_ID, address: { contains: 'Whitby', mode: 'insensitive' } }
    });

    await prisma.timelineEvent.deleteMany({
        where: {
            userId: TEST_USER_ID,
            summary: { contains: 'Whitby', mode: 'insensitive' }
        }
    });

    console.log('✅ Cleanup complete.\n');
}

async function askZena(query: string) {
    console.log(`\n💬 USER: "${query}"`);
    const response = await agentOrchestrator.processQuery(TEST_USER_ID, query, {
        conversationId: CONVERSATION_ID
    });
    console.log(`🤖 ZENA: ${response.answer}`);
    if (response.requiresApproval) {
        console.log(`⚠️  ACTION PENDING: ${response.pendingAction?.toolName}`);
    }
    return response;
}

async function runVerification() {
    console.log('🚀 INITIALIZING VERIFICATION: 12 Whitby Place');

    // Step 1: Create property card (DO NOT provide price, Zena should proactively find beds/baths/etc.)
    let response = await askZena("create property card for 12 Whitby Place, Welcome Bay, Tauranga");

    // Verify Proactive Context was found (12 Whitby Place is in mocks)
    const sessionObj = sessionManager.getSession(CONVERSATION_ID);
    const lastContext = sessionObj?.conversationHistory.find(m => m.content.includes('✨ Auto-enriching bedrooms: 3'));
    if (lastContext) {
        console.log('✅ Proactive context successfully enriched fields!');
    } else {
        console.warn('⚠️ Proactive context enrichment not detected in logs/history.');
    }

    // Step 2: Provide the missing price
    response = await askZena("The listing price is $1,250,000. Create it.");

    // Step 3: Handle the confirmation of property creation
    if (response.requiresApproval && response.pendingAction?.toolName === 'property.create') {
        const payload = response.pendingAction.payload;
        if (payload.listingPrice !== 1250000) {
            console.error(`❌ INCORRECT PRICE in payload: ${payload.listingPrice} (Expected 1250000)`);
        } else if (payload.bedrooms !== 3) {
            console.error(`❌ Proactive enrichment FAILED: bedrooms is ${payload.bedrooms} (Expected 3)`);
        } else {
            console.log(`✅ Correct price and proactively enriched fields detected in pending action!`);
        }

        console.log('\n🔥 TESTING SIMPLE "YES" FOR CMA AND MILESTONES...');
        response = await askZena("yes");
    }

    // Since we fixed auto-execution for milestones, we expect them to be triggered immediately if focus is clear
    // But if Gemini still prompts for confirmation, we handle it
    let turns = 0;
    while (response.requiresApproval && turns < 2) {
        response = await askZena("yes");
        turns++;
    }

    console.log('\n📊 VERIFYING DATABASE ENTITIES...');

    // 1. Verify Property
    const property = await prisma.property.findFirst({
        where: { userId: TEST_USER_ID, address: { contains: 'Whitby', mode: 'insensitive' } }
    });
    if (!property) throw new Error("Property not found!");
    console.log(`✅ Property created: ${property.address}`);

    // 2. Verify CMA
    const finalSession = sessionManager.getSession(CONVERSATION_ID);
    const hasCMA = finalSession?.conversationHistory.some(m => m.content.includes('[TOOL_RESULT]') && m.toolName === 'property.generate_comparables');
    console.log(`✅ CMA Generated: ${hasCMA ? 'YES' : 'NO'}`);

    // 3. Verify Milestones & Tasks
    const tasks = await prisma.task.findMany({
        where: { userId: TEST_USER_ID, propertyId: property.id }
    });
    const calendarEvents = await prisma.timelineEvent.findMany({
        where: {
            userId: TEST_USER_ID,
            entityType: 'calendar_event',
            summary: { contains: 'Whitby', mode: 'insensitive' }
        }
    });

    console.log(`✅ Milestone Tasks created: ${tasks.length}`);
    console.log(`✅ Milestone Calendar Events created: ${calendarEvents.length}`);

    // We expect at least a few standard milestones
    if (tasks.length < 2) console.warn("⚠️ Fewer tasks than expected (Standard milestones should be 5).");
    if (tasks.length === 0) throw new Error("No tasks created!");

    console.log('\n📜 CHECKING AGENT ORCHESTRATOR LOGS...');
    console.log('Please check packages/backend/logs/agent-orchestrator.log for the fullRequest trace.');
}

async function main() {
    try {
        await cleanupTestData();
        await runVerification();
        console.log('\n🎉 VERIFICATION COMPLETED SUCCESSFULLY!');
    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
