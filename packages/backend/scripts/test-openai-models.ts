#!/usr/bin/env node

/**
 * Test OpenAI Model Availability
 * Checks which models are available for your API key
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testModels() {
  console.log('🔍 Testing OpenAI Model Availability...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  // List of models to test
  const modelsToTest = [
    'gpt-5-mini',
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ];

  console.log('🧪 Testing models...\n');

  for (const model of modelsToTest) {
    try {
      console.log(`Testing: ${model}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'Hello',
            },
          ],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${model} - AVAILABLE`);
        console.log(`   Response: "${data.choices[0]?.message?.content || 'No content'}"`);
      } else {
        const error = await response.json();
        console.log(`❌ ${model} - NOT AVAILABLE`);
        console.log(`   Error: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${model} - ERROR: ${error}`);
    }
    
    console.log('');
  }

  // Also try to list available models
  console.log('📋 Fetching available models from API...\n');
  
  try {
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      const chatModels = modelsData.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort();
      
      console.log('✅ Available GPT models:');
      chatModels.forEach((model: string) => {
        console.log(`   • ${model}`);
      });
    } else {
      console.log('❌ Could not fetch model list');
    }
  } catch (error) {
    console.log('❌ Error fetching models:', error);
  }
}

testModels();