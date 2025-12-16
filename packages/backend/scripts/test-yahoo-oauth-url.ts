import { oauthService } from '../src/services/oauth.service.js';

/**
 * Test script to generate Yahoo OAuth URL
 * This helps verify the OAuth configuration is correct
 */

async function testYahooOAuthUrl() {
  console.log('=== Yahoo OAuth URL Test ===\n');

  try {
    // Generate a test state
    const testState = Buffer.from(
      JSON.stringify({
        userId: 'test-user-id',
        provider: 'yahoo',
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Get authorization URL
    const authUrl = oauthService.getAuthorizationUrl('yahoo', testState);

    console.log('✅ Generated Yahoo OAuth URL:\n');
    console.log(authUrl);
    console.log('\n');

    // Parse and display the parameters
    const url = new URL(authUrl);
    console.log('OAuth Parameters:');
    console.log('- client_id:', url.searchParams.get('client_id'));
    console.log('- redirect_uri:', url.searchParams.get('redirect_uri'));
    console.log('- response_type:', url.searchParams.get('response_type'));
    console.log('- scope:', url.searchParams.get('scope'));
    console.log('- state:', url.searchParams.get('state'));
    console.log('- access_type:', url.searchParams.get('access_type'));
    console.log('- prompt:', url.searchParams.get('prompt'));

    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Copy the URL above and paste it in your browser');
    console.log('2. Log in to Yahoo and authorize the app');
    console.log('3. Check if you get redirected to the callback URL');
    console.log('4. If you see "invalid_scope" error, the scopes need to be updated in Yahoo Developer Console');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testYahooOAuthUrl();
