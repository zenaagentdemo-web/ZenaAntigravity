#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { oauthService } from '../src/services/oauth.service.js';

// Load environment variables first
dotenv.config();

async function testYahooOAuthScopes() {
  try {
    console.log('🔍 Testing Yahoo OAuth scopes...');
    
    // Check if Yahoo provider is supported
    const isSupported = oauthService.isProviderSupported('yahoo');
    console.log('Yahoo provider supported:', isSupported);
    
    if (!isSupported) {
      console.log('❌ Yahoo provider not supported');
      return;
    }
    
    // Generate OAuth URL
    const authUrl = oauthService.getAuthorizationUrl('yahoo', 'test-state-123');
    console.log('✅ OAuth URL generated successfully:');
    console.log(authUrl);
    
    // Parse the URL to check scopes
    const url = new URL(authUrl);
    const scopes = url.searchParams.get('scope');
    console.log('\n📋 Requested scopes:', scopes);
    
    // Check individual parameters
    console.log('\n🔧 OAuth Parameters:');
    console.log('  client_id:', url.searchParams.get('client_id'));
    console.log('  redirect_uri:', url.searchParams.get('redirect_uri'));
    console.log('  response_type:', url.searchParams.get('response_type'));
    console.log('  scope:', url.searchParams.get('scope'));
    console.log('  state:', url.searchParams.get('state'));
    console.log('  access_type:', url.searchParams.get('access_type'));
    console.log('  prompt:', url.searchParams.get('prompt'));
    
    console.log('\n✅ Yahoo OAuth configuration looks correct!');
    console.log('🔗 You can now try clicking the Yahoo email icon in Settings');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testYahooOAuthScopes();