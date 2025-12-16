#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function resetYahooAccount() {
  try {
    console.log('🔄 Resetting Yahoo email account...');
    
    // Find and delete the Yahoo email account
    const account = await prisma.emailAccount.findFirst({
      where: { provider: 'yahoo' },
      select: {
        id: true,
        email: true,
        provider: true,
      },
    });

    if (!account) {
      console.log('❌ No Yahoo email account found');
      return;
    }

    console.log(`📧 Found Yahoo account: ${account.email} (ID: ${account.id})`);
    
    // Delete associated threads first (due to foreign key constraints)
    const threadCount = await prisma.thread.count({
      where: { emailAccountId: account.id },
    });
    
    if (threadCount > 0) {
      console.log(`🗑️  Deleting ${threadCount} associated threads...`);
      await prisma.thread.deleteMany({
        where: { emailAccountId: account.id },
      });
    }
    
    // Delete the email account
    await prisma.emailAccount.delete({
      where: { id: account.id },
    });
    
    console.log('✅ Yahoo email account deleted successfully');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Go to Settings page in the frontend');
    console.log('2. Click the Yahoo email icon to reconnect');
    console.log('3. Make sure to use your actual Yahoo email address during OAuth');
    console.log('4. Ensure "Email - Read" permissions are enabled in Yahoo Developer Console');

  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetYahooAccount();