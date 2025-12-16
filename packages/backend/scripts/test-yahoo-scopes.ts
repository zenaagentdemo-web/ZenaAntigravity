import { oauthService } from '../src/services/oauth.service.js';

console.log('Testing Yahoo OAuth URL generation...\n');

try {
  const authUrl = oauthService.getAuthorizationUrl('yahoo', 'test-state-123');
  console.log('Generated OAuth URL:');
  console.log(authUrl);
  console.log('\n');
  
  // Parse and display the URL components
  const url = new URL(authUrl);
  console.log('URL Components:');
  console.log('- Base URL:', url.origin + url.pathname);
  console.log('- Client ID:', url.searchParams.get('client_id'));
  console.log('- Redirect URI:', url.searchParams.get('redirect_uri'));
  console.log('- Scope:', url.searchParams.get('scope'));
  console.log('- Response Type:', url.searchParams.get('response_type'));
  console.log('- State:', url.searchParams.get('state'));
  console.log('- Access Type:', url.searchParams.get('access_type'));
  console.log('- Prompt:', url.searchParams.get('prompt'));
  
} catch (error) {
  console.error('Error:', error);
}
