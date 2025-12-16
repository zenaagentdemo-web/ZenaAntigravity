#!/usr/bin/env node

/**
 * Gmail OAuth Setup Script
 * Helps configure Gmail OAuth credentials for Zena
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGmailOAuth() {
  console.log('🔧 Gmail OAuth Setup for Zena\n');
  
  console.log('Before running this script, make sure you have:');
  console.log('1. Created a Google Cloud project');
  console.log('2. Enabled the Gmail API');
  console.log('3. Configured OAuth consent screen');
  console.log('4. Created OAuth 2.0 credentials');
  console.log('');
  console.log('See GMAIL_OAUTH_SETUP_GUIDE.md for detailed instructions.\n');

  const proceed = await question('Have you completed the Google Cloud setup? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('Please complete the Google Cloud setup first and then run this script again.');
    rl.close();
    return;
  }

  console.log('\n📝 Enter your Gmail OAuth credentials:\n');

  const clientId = await question('Google Client ID: ');
  const clientSecret = await question('Google Client Secret: ');
  
  if (!clientId || !clientSecret) {
    console.log('❌ Client ID and Client Secret are required.');
    rl.close();
    return;
  }

  // Read current .env file
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (error) {
    console.log('❌ Could not read .env file. Make sure you are running this from packages/backend/');
    rl.close();
    return;
  }

  // Update Gmail OAuth credentials
  const updatedContent = envContent
    .replace(/GOOGLE_CLIENT_ID=.*/, `GOOGLE_CLIENT_ID=${clientId}`)
    .replace(/GOOGLE_CLIENT_SECRET=.*/, `GOOGLE_CLIENT_SECRET=${clientSecret}`);

  // Write updated .env file
  fs.writeFileSync(envPath, updatedContent);

  console.log('\n✅ Gmail OAuth credentials updated in .env file!');
  console.log('\n🚀 Next steps:');
  console.log('1. Restart your backend server: npm run dev');
  console.log('2. Go to http://localhost:5173/settings');
  console.log('3. Click the Gmail icon to connect your account');
  console.log('4. Grant permissions and your emails will start syncing!');
  console.log('\n💡 Tip: Check the backend logs to see sync progress.');

  rl.close();
}

setupGmailOAuth().catch(console.error);