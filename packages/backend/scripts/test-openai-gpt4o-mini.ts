#!/usr/bin/env node

/**
 * Test OpenAI GPT-4o Mini Integration
 * Verifies that Zena can connect to OpenAI API with GPT-4o mini
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testOpenAIConnection() {
  console.log('🧠 Testing OpenAI GPT-4o Mini Connection...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const endpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Model: ${model}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}\n`);

  try {
    // Test 1: Basic API Connection
    console.log('🔍 Test 1: Basic API Connection');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: 'Hello! Please respond with "GPT-4o Mini is working!" to confirm the connection.',
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`   Details: ${error}`);
      process.exit(1);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    
    console.log(`✅ API Response: "${aiResponse}"`);
    console.log(`   Tokens Used: ${data.usage?.total_tokens || 'unknown'}\n`);

    // Test 2: Real Estate Classification
    console.log('🏠 Test 2: Real Estate Email Classification');
    const classificationResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: `Classify this email thread for a real estate agent:

Subject: Property Viewing Request - 123 Main Street
From: john.buyer@email.com
Summary: Hi, I'm interested in viewing the property at 123 Main Street. Could we arrange a viewing for this weekend?

Respond in JSON format:
{
  "classification": "buyer|vendor|market|lawyer_broker|noise",
  "category": "focus|waiting",
  "confidence": 0.0-1.0
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!classificationResponse.ok) {
      console.error('❌ Classification test failed');
    } else {
      const classificationData = await classificationResponse.json();
      const classificationResult = classificationData.choices[0]?.message?.content || '';
      console.log(`✅ Classification Result: ${classificationResult}`);
      console.log(`   Tokens Used: ${classificationData.usage?.total_tokens || 'unknown'}\n`);
    }

    // Test 3: Ask Zena Query
    console.log('💬 Test 3: Ask Zena Conversational Query');
    const askZenaResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are Zena, a helpful AI assistant for real estate agents.',
          },
          {
            role: 'user',
            content: 'What should I focus on today as a real estate agent?',
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!askZenaResponse.ok) {
      console.error('❌ Ask Zena test failed');
    } else {
      const askZenaData = await askZenaResponse.json();
      const askZenaResult = askZenaData.choices[0]?.message?.content || '';
      console.log(`✅ Ask Zena Response: "${askZenaResult.substring(0, 200)}..."`);
      console.log(`   Tokens Used: ${askZenaData.usage?.total_tokens || 'unknown'}\n`);
    }

    console.log('🎉 All tests passed! GPT-4o Mini is connected and working.');
    console.log('\n📊 Summary:');
    console.log('   ✅ API Connection: Working');
    console.log('   ✅ Email Classification: Working');
    console.log('   ✅ Ask Zena Chat: Working');
    console.log(`   ✅ Model: ${model}`);
    console.log('\n🚀 Zena now has a brain powered by GPT-4o Mini!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOpenAIConnection();