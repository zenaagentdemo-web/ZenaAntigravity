#!/usr/bin/env node
/**
 * Test Yahoo OAuth Configuration
 * Run with: npx tsx packages/backend/scripts/test-yahoo-oauth.ts
 */

import { oauthService } from '../src/services/oauth.service.js';

console.log('=== Testing Yahoo OAuth Configuration ===\n');

// Test 1: Check if Yahoo provider is supported
console.log('Test 1: Provider Support');
const isSupported = oauthService.isProviderSupported('yahoo');
console.log(`Yahoo provider supported: ${isSupported ? '✅' : '❌'}`);

if (!isSupported) {
  console.error('Yahoo provider is not supported!');
  process.exit(1);
}

// Test 2: Generate authorization URL
console.log('\nTest 2: Authorization URL Generation');
try {
  const testState = 'test-state-12345';
  const authUrl = oauthService.getAuthorizationUrl('yahoo', testState);
  console.log('✅ Authorization URL generated successfully');
  console.log('URL:', authUrl);
  
  // Verify URL contains required parameters
  const url = new URL(authUrl);
  console.log('\nURL Parameters:');
  console.log('- client_id:', url.searchParams.get('client_id') ? '✅' : '❌');
  console.log('- redirect_uri:', url.searchParams.get('redirect_uri') ? '✅' : '❌');
  console.log('- response_type:', url.searchParams.get('response_type'));
  console.log('- scope:', url.searchParams.get('scope'));
  console.log('- state:', url.searchParams.get('state'));
  
  // Check if credentials are configured
  const clientId = url.searchParams.get('client_id');
  if (!clientId || clientId === '' || clientId === 'undefined') {
    console.error('\n❌ YAHOO_CLIENT_ID is not configured in .env file!');
    process.exit(1);
  }
  
  const redirectUri = url.searchParams.get('redirect_uri');
  console.log('\nRedirect URI:', redirectUri);
  
  if (redirectUri?.includes('ngrok')) {
    console.log('✅ Using ngrok HTTPS URL (required for Yahoo OAuth)');
  } else if (redirectUri?.includes('localhost')) {
    console.warn('⚠️  Warning: Using localhost. Yahoo OAuth requires HTTPS in production.');
  }
  
} catch (error) {
  console.error('❌ Failed to generate authorization URL:', error);
  process.exit(1);
}

// Test 3: Check environment variables
console.log('\nTest 3: Environment Variables');
console.log('- YAHOO_CLIENT_ID:', process.env.YAHOO_CLIENT_ID ? '✅ Set' : '❌ Not set');
console.log('- YAHOO_CLIENT_SECRET:', process.env.YAHOO_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
console.log('- YAHOO_REDIRECT_URI:', process.env.YAHOO_REDIRECT_URI || '❌ Not set');

if (!process.env.YAHOO_CLIENT_ID || !process.env.YAHOO_CLIENT_SECRET) {
  console.error('\n❌ Yahoo OAuth credentials are not configured!');
  console.error('Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in .env file');
  process.exit(1);
}

console.log('\n✅ All tests passed! Yahoo OAuth is configured correctly.');
console.log('\nNext steps:');
console.log('1. Make sure ngrok is running: ngrok http 3000');
console.log('2. Make sure backend server is running: npm run dev');
console.log('3. Open frontend: http://localhost:5173');
console.log('4. Go to Settings and click "Connect Yahoo Mail"');
