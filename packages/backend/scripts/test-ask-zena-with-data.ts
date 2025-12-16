#!/usr/bin/env tsx

/**
 * Test Ask Zena functionality with real seeded data
 */

import { PrismaClient } from '@prisma/client';
import { askZenaService } from '../src/services/ask-zena.service.js';

const prisma = new PrismaClient();

async function testAskZenaWithData() {
  console.log('🧠 Testing Ask Zena Service with Real Data...\n');

  try {
    // Get the demo user
    const user = await prisma.user.findUnique({
      where: { email: 'demo@zena.ai' }
    });

    if (!user) {
      console.error('❌ Demo user not found. Run: npx prisma db seed');
      process.exit(1);
    }

    console.log(`📋 Using demo user: ${user.email} (ID: ${user.id})\n`);

    // Test 1: Ask about buyers
    console.log('📋 Test 1: Ask about buyers');
    const buyerResponse = await askZenaService.processQuery({
      userId: user.id,
      query: 'How many buyers do we have?',
      conversationHistory: [],
    });

    console.log('✅ Buyer Response:');
    console.log('   Answer:', buyerResponse.answer);
    console.log('   Sources:', buyerResponse.sources.length);
    console.log('');

    // Test 2: Ask about properties
    console.log('📋 Test 2: Ask about properties');
    const propertyResponse = await askZenaService.processQuery({
      userId: user.id,
      query: 'Tell me about the properties we have',
      conversationHistory: [],
    });

    console.log('✅ Property Response:');
    console.log('   Answer:', propertyResponse.answer);
    console.log('   Sources:', propertyResponse.sources.length);
    console.log('');

    // Test 3: Ask about deals
    console.log('📋 Test 3: Ask about deals');
    const dealResponse = await askZenaService.processQuery({
      userId: user.id,
      query: 'What deals need my attention?',
      conversationHistory: [],
    });

    console.log('✅ Deal Response:');
    console.log('   Answer:', dealResponse.answer);
    console.log('   Sources:', dealResponse.sources.length);
    console.log('');

    // Test 4: Ask about contacts
    console.log('📋 Test 4: Ask about contacts');
    const contactResponse = await askZenaService.processQuery({
      userId: user.id,
      query: 'Who are my contacts?',
      conversationHistory: [],
    });

    console.log('✅ Contact Response:');
    console.log('   Answer:', contactResponse.answer);
    console.log('   Sources:', contactResponse.sources.length);
    console.log('');

    // Show what data exists
    console.log('📊 Database Summary:');
    const contacts = await prisma.contact.count({ where: { userId: user.id } });
    const properties = await prisma.property.count({ where: { userId: user.id } });
    const deals = await prisma.deal.count({ where: { userId: user.id } });
    const tasks = await prisma.task.count({ where: { userId: user.id } });
    const threads = await prisma.thread.count({ where: { userId: user.id } });

    console.log(`   Contacts: ${contacts}`);
    console.log(`   Properties: ${properties}`);
    console.log(`   Deals: ${deals}`);
    console.log(`   Tasks: ${tasks}`);
    console.log(`   Threads: ${threads}`);

    console.log('\n🎉 Ask Zena tests with real data completed!');

  } catch (error) {
    console.error('❌ Ask Zena test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAskZenaWithData().catch(console.error);