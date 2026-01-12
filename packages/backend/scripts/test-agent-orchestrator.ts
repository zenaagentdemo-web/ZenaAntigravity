#!/usr/bin/env tsx

import { agentOrchestrator } from '../src/services/agent-orchestrator.service.js';
import { sessionManager } from '../src/services/session-manager.service.js';
import prisma from '../src/config/database.js';
import { logger } from '../src/services/logger.service.js';

// Test Configuration
const TEST_USER_ID = '285f391f-e55b-4c49-9778-f00f830b7b4a'; // demo@zena.ai
const CONVERSATION_ID = 'test-orchestrator-convo-' + Date.now();

async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');

    // Delete tasks first due to relations
    await prisma.task.deleteMany({
        where: {
            userId: TEST_USER_ID,
            OR: [
                { label: { contains: 'Photography', mode: 'insensitive' } },
                { label: { contains: 'pre-appraisal', mode: 'insensitive' } },
                { label: { contains: 'CMA', mode: 'insensitive' } }
            ]
        }
    });

    // Delete properties created in tests (using unique address parts)
    await prisma.property.deleteMany({
        where: {
            userId: TEST_USER_ID,
            OR: [
                { address: { contains: 'Dominion Road', mode: 'insensitive' } },
                { address: { contains: '10 High Street', mode: 'insensitive' } },
                { address: { contains: '55 Broadway', mode: 'insensitive' } }
            ]
        }
    });

    // Delete contacts created in tests
    await prisma.contact.deleteMany({
        where: {
            userId: TEST_USER_ID,
            OR: [
                { name: 'John Smith' },
                { name: 'Sarah Jane' }
            ]
        }
    });

    // Clear session to start fresh
    const session = sessionManager.getOrCreateSession(TEST_USER_ID, CONVERSATION_ID);
    sessionManager.clearPendingConfirmation(session.sessionId);
    session.conversationHistory = [];
    session.autoExecuteMode = false;

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

async function runScenario1() {
    console.log('🚀 SCENARIO 1: Property Intelligence & Vendor Onboarding');

    // Step 1: Create property
    let response = await askZena("Create a property card for 282 Dominion Road, Tuakau.");

    // Should offer to create since it doesn't exist
    if (response.requiresApproval && response.pendingAction?.toolName === 'property.create') {
        response = await askZena("yes");
    }

    // Verify property creation
    const property = await prisma.property.findFirst({
        where: {
            userId: TEST_USER_ID,
            address: { contains: 'Dominion Road', mode: 'insensitive' }
        }
    });

    if (!property) throw new Error("Property not found in database after creation!");
    console.log(`✅ Property created: ${property.address} (ID: ${property.id})`);
    console.log(`   Intelligence: Land: ${property.landSize}, Floor: ${property.floorSize}`);

    // Step 2: Add Vendor
    response = await askZena("The vendor is John Smith, john.smith@example.com, 021 123 4567.");

    // Handle approval for contact creation if needed
    if (response.requiresApproval && response.pendingAction?.toolName === 'contact.create') {
        response = await askZena("yes");
    }

    // Verify contact creation and linking
    const contact = await prisma.contact.findFirst({
        where: { name: 'John Smith' },
        include: { vendorProperties: true }
    });

    if (!contact) throw new Error("Contact John Smith not found!");
    const isLinked = contact.vendorProperties.some(p => p.id === property.id);
    console.log(`✅ Contact created and linked as vendor: ${contact.name} (${isLinked ? 'LINKED' : 'NOT LINKED'})`);

    // Step 3: CMA & Milestones
    response = await askZena("Yes, please generate a CMA and log the Photography milestone for tomorrow.");

    // We might need to handle one more "yes" if the orchestrator asks to confirm CMA/Milestones separately
    // but usually autoExecuteMode should kick in.
    while (response.requiresApproval) {
        response = await askZena("yes");
    }

    // Verification
    const updatedProperty = await prisma.property.findUnique({
        where: { id: property.id }
    });

    const tasks = await prisma.task.findMany({
        where: { propertyId: property.id }
    });

    const calendarEvents = await prisma.timelineEvent.findMany({
        where: {
            userId: TEST_USER_ID,
            entityType: 'calendar_event',
            summary: { contains: 'Photography', mode: 'insensitive' }
        }
    });

    console.log(`✅ Milestones added to property: ${Array.isArray(updatedProperty?.milestones) ? updatedProperty.milestones.length : 0}`);
    console.log(`✅ Tasks created: ${tasks.length}`);
    tasks.forEach(t => console.log(`   - [ ] ${t.label} (Status: ${t.status}, Source: ${t.source})`));

    console.log(`✅ Calendar (Timeline) Events created: ${calendarEvents.length}`);

    // Specific verify for "Super Intel"
    const hasFollowUp = tasks.some(t => t.label.includes('Review photos'));
    console.log(`✅ 🧠 Super Intel: Follow-up task created: ${hasFollowUp ? 'YES' : 'NO'}`);

    if (!hasFollowUp || calendarEvents.length === 0) {
        throw new Error("Milestone coupling failed: Tasks or Calendar events missing!");
    }
}

async function runScenario2() {
    console.log('\n🚀 SCENARIO 2: Lead Conversion & Calendar Management');

    const prompt = "I just spoke with Sarah Jane (sarah.jane@agent.com) about 10 High Street. She wants a valuation next Tuesday at 2pm. Also set a reminder to send her the pre-appraisal pack.";
    let response = await askZena(prompt);

    // Handle approvals if any
    while (response.requiresApproval) {
        response = await askZena("yes");
    }

    // Verification
    const contact = await prisma.contact.findFirst({ where: { userId: TEST_USER_ID, name: { contains: 'Sarah Jane', mode: 'insensitive' } } });
    const property = await prisma.property.findFirst({ where: { userId: TEST_USER_ID, address: { contains: '10 High Street', mode: 'insensitive' } } });
    const task = await prisma.task.findFirst({ where: { userId: TEST_USER_ID, label: { contains: 'pre-appraisal', mode: 'insensitive' } } });

    console.log(`✅ Contact Sarah Jane: ${contact ? 'CREATED' : 'MISSING'}`);
    console.log(`✅ Property 10 High St: ${property ? 'CREATED' : 'MISSING'}`);
    console.log(`✅ Task "Pre-appraisal": ${task ? 'CREATED' : 'MISSING'}`);
}

async function runScenario3() {
    console.log('\n🚀 SCENARIO 3: Market Analysis & Listing Preparation');

    // 1. Start listing campaign
    let response = await askZena("Start a listing campaign for 55 Broadway, Newmarket. Search for it first and create it if missing.");

    while (response.requiresApproval) {
        response = await askZena("yes");
    }

    // 2. Add tasks
    response = await askZena("Book the photographer for Friday morning and find 3 comparable sales in the area.");

    while (response.requiresApproval) {
        response = await askZena("yes");
    }

    // Verification
    const property = await prisma.property.findFirst({ where: { userId: TEST_USER_ID, address: { contains: '55 Broadway', mode: 'insensitive' } } });
    const tasks = await prisma.task.findMany({ where: { userId: TEST_USER_ID, propertyId: property?.id } });

    console.log(`✅ Property 55 Broadway: ${property ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Tasks for campaign: ${tasks.length}`);
    tasks.forEach(t => console.log(`   - [ ] ${t.label}`));
}

async function main() {
    try {
        await cleanupTestData();

        await runScenario1();
        await runScenario2();
        await runScenario3();

        console.log('\n🎉 ALL INTEGRATION SCENARIOS COMPLETED SUCCESSFULLY!');
    } catch (error) {
        console.error('\n❌ TEST FAILED:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
