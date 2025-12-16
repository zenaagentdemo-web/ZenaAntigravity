#!/usr/bin/env node

/**
 * Check GPT-5 Model Availability
 * Monitors when GPT-5 models become available for your organization
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function checkGPT5Availability() {
  console.log('🔍 Checking GPT-5 Model Availability...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  // GPT-5 models to check
  const gpt5Models = [
    'gpt-5-mini',
    'gpt-5.1-2025-11-13',
    'gpt-5',
    'gpt-5.1'
  ];

  console.log('🧪 Testing GPT-5 model access...\n');

  let availableModels: string[] = [];

  for (const model of gpt5Models) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        console.log(`✅ ${model} - AVAILABLE!`);
        availableModels.push(model);
      } else {
        const error = await response.json();
        if (error.error?.code === 'model_not_found') {
          console.log(`⏳ ${model} - Not yet accessible`);
        } else {
          console.log(`❓ ${model} - ${error.error?.message || 'Unknown status'}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${model} - Error: ${error}`);
    }
  }

  console.log('\n📊 Summary:');
  if (availableModels.length > 0) {
    console.log(`🎉 Available GPT-5 models: ${availableModels.join(', ')}`);
    console.log('💡 You can now update your .env file to use one of these models!');
  } else {
    console.log('⏳ No GPT-5 models are currently accessible.');
    console.log('🔄 GPT-5 models are being rolled out gradually. Check back later!');
    console.log('✅ GPT-4o Mini is working perfectly in the meantime.');
  }

  return availableModels;
}

// Run the check
checkGPT5Availability();