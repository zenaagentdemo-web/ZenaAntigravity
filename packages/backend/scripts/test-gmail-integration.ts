#!/usr/bin/env node

/**
 * Gmail Integration Test Script
 * Tests Gmail OAuth and API connectivity
 */

import { PrismaClient } from '@prisma/client';
import { oauthService } from '../src/services/oauth.service.js';
import { gmailConnectorService } from '../src/services/gmail-connector.service.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testGmailIntegration() {
  try {
    console.log('🧪 Testing Gmail Integration...\n');

    // Check environment variables
    console.log('1. Checking environment variables...');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || clientId === 'your-google-client-id') {
      console.log('❌ GOOGLE_CLIENT_ID not configured');
      return;
    }

    if (!clientSecret || clientSecret === 'your-google-client-secret') {
      console.log('❌ GOOGLE_CLIENT_SECRET not configured');
      return;
    }

    console.log('✅ Environment variables configured');
    console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
    console.log(`   Redirect URI: ${redirectUri}\n`);

    // Check for Gmail accounts in database
    console.log('2. Checking for Gmail accounts...');
    const gmailAccounts = await prisma.emailAccount.findMany({
      where: { provider: 'gmail' },
      select: {
        id: true,
        email: true,
        lastSyncAt: true,
        syncEnabled: true,
      },
    });

    if (gmailAccounts.length === 0) {
      console.log('❌ No Gmail accounts found in database');
      console.log('   Please connect a Gmail account through the Settings page first.\n');
      
      // Generate OAuth URL for testing
      console.log('3. Generating OAuth URL for testing...');
      try {
        const authUrl = oauthService.getAuthorizationUrl('gmail', 'test-state');
        console.log('✅ OAuth URL generated successfully');
        console.log(`   URL: ${authUrl.substring(0, 100)}...\n`);
        console.log('💡 You can use this URL to test the OAuth flow manually.');
      } catch (error) {
        console.log('❌ Failed to generate OAuth URL:', error);
      }
      return;
    }

    console.log(`✅ Found ${gmailAccounts.length} Gmail account(s):`);
    gmailAccounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.email} (Last sync: ${account.lastSyncAt || 'Never'})`);
    });

    // Test Gmail API connectivity
    console.log('\n3. Testing Gmail API connectivity...');
    const testAccount = gmailAccounts[0];
    
    try {
      // Get access token
      const { emailAccountService } = await import('../src/services/email-account.service.js');
      const accessToken = await emailAccountService.getValidAccessToken(testAccount.id);
      console.log('✅ Access token retrieved successfully');

      // Test Gmail API call
      const threads = await gmailConnectorService.fetchThreads(accessToken, null);
      console.log(`✅ Gmail API call successful - fetched ${threads.length} threads`);

      if (threads.length > 0) {
        const firstThread = threads[0];
        console.log(`   Sample thread: "${firstThread.subject}" (${firstThread.messages.length} messages)`);
      }

    } catch (error) {
      console.log('❌ Gmail API test failed:', error);
      console.log('   This might indicate token expiration or API issues.');
    }

    console.log('\n4. Testing sync engine...');
    try {
      const { syncEngineService } = await import('../src/services/sync-engine.service.js');
      const result = await syncEngineService.triggerManualSync(testAccount.id);
      
      if (result.success) {
        console.log(`✅ Sync completed successfully - processed ${result.threadsProcessed} threads`);
      } else {
        console.log(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.log('❌ Sync engine test failed:', error);
    }

    console.log('\n🎉 Gmail integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGmailIntegration();