#!/usr/bin/env tsx

/**
 * Test Ask Zena functionality
 */

import { askZenaService } from '../src/services/ask-zena.service.js';

async function testAskZena() {
  console.log('🧠 Testing Ask Zena Service...\n');

  try {
    // Test basic query
    console.log('📋 Test 1: Basic Query');
    const response = await askZenaService.processQuery({
      userId: 'test-user-id',
      query: 'What deals need my attention today?',
      conversationHistory: [],
    });

    console.log('✅ Response received:');
    console.log('   Answer:', response.answer);
    console.log('   Sources:', response.sources.length);
    console.log('   Suggested Actions:', response.suggestedActions?.length || 0);
    console.log('');

    // Test property query
    console.log('📋 Test 2: Property Query');
    const propertyResponse = await askZenaService.processQuery({
      userId: 'test-user-id',
      query: 'Show me properties with viewings this week',
      conversationHistory: [],
    });

    console.log('✅ Property Response received:');
    console.log('   Answer:', propertyResponse.answer);
    console.log('   Sources:', propertyResponse.sources.length);
    console.log('');

    // Test contact query
    console.log('📋 Test 3: Contact Query');
    const contactResponse = await askZenaService.processQuery({
      userId: 'test-user-id',
      query: 'Who are my active buyers?',
      conversationHistory: [],
    });

    console.log('✅ Contact Response received:');
    console.log('   Answer:', contactResponse.answer);
    console.log('   Sources:', contactResponse.sources.length);
    console.log('');

    console.log('🎉 All Ask Zena tests passed!');

  } catch (error) {
    console.error('❌ Ask Zena test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAskZena().catch(console.error);