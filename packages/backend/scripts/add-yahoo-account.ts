import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { encryptToken } from '../src/utils/encryption.js';

dotenv.config();

const prisma = new PrismaClient();

async function addYahooAccount() {
  try {
    // Get user (assuming demo user)
    const user = await prisma.user.findUnique({
      where: { email: 'demo@zena.ai' },
    });

    if (!user) {
      console.error('❌ Demo user not found. Please run seed first: npm run db:seed');
      process.exit(1);
    }

    const yahooEmail = process.env.YAHOO_EMAIL;
    const yahooPassword = process.env.YAHOO_APP_PASSWORD;

    if (!yahooEmail || !yahooPassword) {
      console.error('❌ Yahoo credentials not found in .env file');
      console.error('Please add:');
      console.error('  YAHOO_EMAIL=your-email@yahoo.com');
      console.error('  YAHOO_APP_PASSWORD=your-16-char-app-password');
      process.exit(1);
    }

    // Check if account already exists
    const existing = await prisma.emailAccount.findFirst({
      where: {
        userId: user.id,
        email: yahooEmail,
      },
    });

    if (existing) {
      console.log('✅ Yahoo account already exists in database');
      console.log(`   Email: ${yahooEmail}`);
      console.log(`   ID: ${existing.id}`);
      return;
    }

    // Encrypt the app password
    const encryptedPassword = encryptToken(yahooPassword);

    // Add Yahoo account to database
    const emailAccount = await prisma.emailAccount.create({
      data: {
        userId: user.id,
        provider: 'yahoo',
        email: yahooEmail,
        accessToken: encryptedPassword, // Store app password as access token
        refreshToken: '', // Yahoo doesn't use refresh tokens with app passwords
        tokenExpiry: new Date('2099-12-31'), // App passwords don't expire
        syncEnabled: true,
        lastSyncAt: null,
      },
    });

    console.log('✅ Yahoo email account added successfully!');
    console.log(`   Email: ${yahooEmail}`);
    console.log(`   Provider: yahoo`);
    console.log(`   ID: ${emailAccount.id}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Test the connection by running: npm run test:yahoo-sync');
    console.log('2. Or manually trigger sync from the app Settings page');

  } catch (error) {
    console.error('❌ Error adding Yahoo account:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addYahooAccount();
