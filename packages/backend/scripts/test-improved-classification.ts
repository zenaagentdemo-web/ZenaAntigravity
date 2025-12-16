#!/usr/bin/env node

/**
 * Test Improved Classification
 * Tests the new AI classification on sample emails
 */

import dotenv from 'dotenv';
import path from 'path';
import { AIProcessingService } from '../src/services/ai-processing.service.js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const aiService = new AIProcessingService();

async function testClassification() {
  console.log('🧪 Testing Improved AI Classification...\n');

  // Test cases based on your screenshots
  const testCases = [
    {
      name: "Google Security Alert",
      subject: "Security alert",
      participants: [{ name: "Google", email: "no-reply@accounts.google.com" }],
      summary: "Google Recovery phone was changed zena.agent.demo@gmail.com The recovery phone for your account was changed.",
      expected: "noise"
    },
    {
      name: "Real Estate Marketing", 
      subject: "Real estate marketing",
      participants: [{ name: "Hamish McGee", email: "hamish.mcgee@example.com" }],
      summary: "Good afternoon, I run a small marketing firm specialising in virtual tours for real estate, and I noticed your listings could use some fresh digital flair.",
      expected: "market"
    },
    {
      name: "Property Inquiry",
      subject: "Looking to buy",
      participants: [{ name: "John Buyer", email: "john@example.com" }],
      summary: "Hi Sir, I'm a content marketer focusing on property flips, and I'd love to moderate a collab on your next listing video series.",
      expected: "buyer"
    },
    {
      name: "Want to buy property",
      subject: "Want to buy",
      participants: [{ name: "Jane Smith", email: "jane@example.com" }],
      summary: "Hi there, I got pre-approved last month, but I'm taking it slow—just dipping my toes into open houses around the east side.",
      expected: "buyer"
    },
    {
      name: "AWS Payment Notification",
      subject: "Google Cloud Platform & APIs: Payment received",
      participants: [{ name: "Google Cloud", email: "noreply@google.com" }],
      summary: "Your payment has been received for Google Cloud Platform services.",
      expected: "noise"
    },
    {
      name: "Kiro Support Request", 
      subject: "RE:[CASE 176508697500328] Kiro Support Request",
      participants: [{ name: "Amazon Web Services", email: "support@aws.amazon.com" }],
      summary: "Thank you for contacting Amazon Web Services. We have opened case 176508697500328 to address your issue.",
      expected: "noise"
    },
    {
      name: "Newsletter/Report",
      subject: "Fwd: The Franklin Report November 2025",
      participants: [{ name: "Newsletter", email: "newsletter@franklin.com" }],
      summary: "Begin forwarded message: From: Ian Du Plessis Subject: The Franklin Report November 2025",
      expected: "noise"
    }
  ];

  console.log('🔍 Testing classification on sample emails...\n');

  for (const testCase of testCases) {
    try {
      console.log(`📧 Testing: "${testCase.name}"`);
      console.log(`   Subject: "${testCase.subject}"`);
      
      const result = await aiService.classifyThread({
        id: 'test',
        subject: testCase.subject,
        participants: testCase.participants,
        summary: testCase.summary,
        lastMessageAt: new Date(),
      });

      const isCorrect = result.classification === testCase.expected;
      const status = isCorrect ? '✅' : '❌';
      
      console.log(`   ${status} Result: ${result.classification} (confidence: ${result.confidence})`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Category: ${result.category}`);
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      console.log('');
    }
  }

  console.log('🎯 WHAT YOU SHOULD EXPECT TO SEE:');
  console.log('\n📂 FOCUS (Emails requiring your reply):');
  console.log('   ✅ Property inquiries from potential buyers');
  console.log('   ✅ Listing questions from potential vendors');
  console.log('   ✅ New communications from real estate professionals');
  console.log('   ❌ NO system notifications, newsletters, or tech alerts');
  
  console.log('\n⏳ WAITING (Emails waiting for others to reply):');
  console.log('   ✅ Follow-up emails in existing real estate conversations');
  console.log('   ✅ Responses you\'re waiting for from clients/agents');
  console.log('   ❌ NO marketing emails, reports, or system notifications');
  
  console.log('\n🗑️  FILTERED OUT (Not shown in Focus/Waiting):');
  console.log('   • Google/Yahoo/Microsoft notifications');
  console.log('   • AWS/API/Technical alerts');
  console.log('   • Newsletters and reports');
  console.log('   • Support tickets and confirmations');
  console.log('   • Any non-real estate communications');

  console.log('\n💡 TO IMPROVE CLASSIFICATION:');
  console.log('   1. Run the reclassification script: npm run reclassify');
  console.log('   2. Check your Focus/Waiting pages for improvements');
  console.log('   3. If you still see noise, we can further tune the AI');
}

testClassification();