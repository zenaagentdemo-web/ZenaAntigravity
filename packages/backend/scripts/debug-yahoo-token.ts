#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import { oauthService } from '../src/services/oauth.service.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function debugYahooToken() {
  try {
    console.log('🔍 Debugging Yahoo OAuth token...');
    
    // Get the Yahoo email account
    const account = await prisma.emailAccount.findFirst({
      where: { provider: 'yahoo' },
      select: {
        id: true,
        email: true,
        provider: true,
        accessToken: true,
        refreshToken: true,
        createdAt: true,
        tokenExpiry: true,
      },
    });

    if (!account) {
      console.log('❌ No Yahoo email account found');
      return;
    }

    console.log('📧 Account details:');
    console.log('  ID:', account.id);
    console.log('  Email:', account.email);
    console.log('  Provider:', account.provider);
    console.log('  Created:', account.createdAt);
    console.log('  Token Expiry:', account.tokenExpiry);
    console.log('  Has access token:', !!account.accessToken);
    console.log('  Has refresh token:', !!account.refreshToken);

    if (!account.accessToken) {
      console.log('❌ No access token found');
      return;
    }

    // Test the token by getting user info from Yahoo
    console.log('\n🔑 Testing access token with Yahoo API...');
    try {
      const userEmail = await oauthService.getUserEmail('yahoo', account.accessToken);
      console.log('✅ Token is valid!');
      console.log('📧 Token issued for email:', userEmail);
      
      if (userEmail.toLowerCase() !== account.email.toLowerCase()) {
        console.log('⚠️  EMAIL MISMATCH DETECTED!');
        console.log('   Database email:', account.email);
        console.log('   Token email:   ', userEmail);
        console.log('   This is likely the cause of IMAP authentication failure');
        
        // Update the email in database to match the token
        console.log('\n🔧 Updating database email to match token...');
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: { email: userEmail.toLowerCase() },
        });
        console.log('✅ Email updated in database');
      } else {
        console.log('✅ Email addresses match');
      }
      
    } catch (tokenError) {
      console.error('❌ Token validation failed:', tokenError);
      
      if (account.refreshToken) {
        console.log('\n🔄 Attempting to refresh token...');
        try {
          const newTokens = await oauthService.refreshAccessToken('yahoo', account.refreshToken);
          console.log('✅ Token refreshed successfully');
          
          // Update tokens in database
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: {
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
            },
          });
          
          // Test the new token
          const userEmail = await oauthService.getUserEmail('yahoo', newTokens.accessToken);
          console.log('📧 New token issued for email:', userEmail);
          
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugYahooToken();