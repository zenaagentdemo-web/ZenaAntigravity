import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('=== Yahoo OAuth Configuration Debug ===\n');

console.log('Environment Variables:');
console.log('YAHOO_CLIENT_ID:', process.env.YAHOO_CLIENT_ID);
console.log('YAHOO_CLIENT_SECRET:', process.env.YAHOO_CLIENT_SECRET ? '***' + process.env.YAHOO_CLIENT_SECRET.slice(-4) : 'NOT SET');
console.log('YAHOO_REDIRECT_URI:', process.env.YAHOO_REDIRECT_URI);
console.log();

// Test OAuth URL generation
const clientId = process.env.YAHOO_CLIENT_ID || '';
const redirectUri = process.env.YAHOO_REDIRECT_URI || '';
const scopes = ['mail-r', 'mail-w'];
const state = Buffer.from(JSON.stringify({ userId: 'test-user', provider: 'yahoo', timestamp: Date.now() })).toString('base64');

const authUrl = 'https://api.login.yahoo.com/oauth2/request_auth';
const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: scopes.join(' '),
  state: state,
  access_type: 'offline',
  prompt: 'consent',
});

const fullUrl = `${authUrl}?${params.toString()}`;

console.log('Generated OAuth URL:');
console.log(fullUrl);
console.log();

console.log('URL Parameters:');
console.log('- client_id:', clientId);
console.log('- redirect_uri:', redirectUri);
console.log('- response_type: code');
console.log('- scope:', scopes.join(' '));
console.log('- state:', state);
console.log('- access_type: offline');
console.log('- prompt: consent');
console.log();

console.log('=== Yahoo API Documentation ===');
console.log('According to Yahoo Mail API docs, the correct scopes should be:');
console.log('- For reading mail: "mail-r" or "sdps-r"');
console.log('- For writing mail: "mail-w" or "sdps-w"');
console.log();
console.log('Your app should have these permissions enabled in Yahoo Developer Console:');
console.log('1. Email - Read');
console.log('2. Email - Write (if sending emails)');
console.log('3. Profile - OpenID Connect Permissions (for user info)');
console.log();

console.log('=== Troubleshooting Steps ===');
console.log('1. Verify your Yahoo app has Mail API permissions enabled');
console.log('2. Check if the Client Secret matches the new app (not the old one)');
console.log('3. Try using different scope format: "sdps-r sdps-w" instead of "mail-r mail-w"');
console.log('4. Ensure the redirect URI in Yahoo app matches exactly: ' + redirectUri);
