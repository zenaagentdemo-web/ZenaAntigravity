#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import Imap from 'imap';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testYahooImapOAuth() {
  try {
    console.log('🔄 Testing Yahoo IMAP OAuth2 connection...');
    
    // Get the Yahoo email account
    const account = await prisma.emailAccount.findFirst({
      where: { provider: 'yahoo' },
      select: {
        id: true,
        email: true,
        provider: true,
        accessToken: true,
        refreshToken: true,
      },
    });

    if (!account) {
      console.log('❌ No Yahoo email account found');
      return;
    }

    console.log(`📧 Found Yahoo account: ${account.email}`);
    
    if (!account.accessToken) {
      console.log('❌ No access token found for account');
      return;
    }

    console.log('🔑 Access token available, testing IMAP connection...');

    // Generate XOAUTH2 token
    const xoauth2Token = generateXOAuth2Token(account.email, account.accessToken);
    console.log('🔐 Generated XOAUTH2 token (first 50 chars):', xoauth2Token.substring(0, 50) + '...');

    // Test IMAP connection with OAuth2
    const imapConfig = {
      user: account.email,
      host: 'imap.mail.yahoo.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      xoauth2: xoauth2Token,
      connTimeout: 30000, // 30 seconds
      authTimeout: 30000, // 30 seconds
      debug: console.log, // Enable debug logging
    };

    console.log('📡 Connecting to Yahoo IMAP with OAuth2...');
    console.log('Config:', {
      user: imapConfig.user,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.tls,
      hasXoauth2: !!imapConfig.xoauth2,
    });

    const imap = new Imap(imapConfig);

    return new Promise((resolve, reject) => {
      let connected = false;

      imap.once('ready', () => {
        console.log('✅ IMAP connection successful!');
        connected = true;
        
        // Try to open INBOX
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            console.error('❌ Failed to open INBOX:', err);
            imap.end();
            return reject(err);
          }
          
          console.log('✅ INBOX opened successfully!');
          console.log('📊 INBOX info:', {
            name: box.name,
            messages: box.messages.total,
            recent: box.messages.recent,
            unseen: box.messages.unseen,
          });
          
          imap.end();
          resolve(true);
        });
      });

      imap.once('error', (err) => {
        console.error('❌ IMAP connection error:', err);
        if (!connected) {
          reject(err);
        }
      });

      imap.once('end', () => {
        console.log('📡 IMAP connection ended');
        if (!connected) {
          resolve(false);
        }
      });

      // Connect
      imap.connect();
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateXOAuth2Token(user: string, accessToken: string): string {
  const authString = `user=${user}\x01auth=Bearer ${accessToken}\x01\x01`;
  return Buffer.from(authString).toString('base64');
}

testYahooImapOAuth();