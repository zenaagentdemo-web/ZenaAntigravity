#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { syncEngineService } from '../src/services/sync-engine.service.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testSync() {
  try {
    console.log('🔄 Testing sync functionality...');
    
    // Get all email accounts
    const accounts = await prisma.emailAccount.findMany({
      select: {
        id: true,
        email: true,
        provider: true,
        userId: true,
        lastSyncAt: true,
        syncEnabled: true,
      },
    });

    console.log(`Found ${accounts.length} email accounts:`);
    accounts.forEach(account => {
      console.log(`  - ${account.email} (${account.provider}) - Last sync: ${account.lastSyncAt || 'Never'} - Enabled: ${account.syncEnabled}`);
    });

    if (accounts.length === 0) {
      console.log('❌ No email accounts found. Connect an email account first.');
      return;
    }

    // Test sync for first account
    const account = accounts[0];
    console.log(`\n🚀 Testing sync for account: ${account.email}`);
    
    const result = await syncEngineService.triggerManualSync(account.id);
    
    console.log('📊 Sync result:', {
      success: result.success,
      threadsProcessed: result.threadsProcessed,
      error: result.error,
    });

    // Check updated sync time
    const updatedAccount = await prisma.emailAccount.findUnique({
      where: { id: account.id },
      select: { lastSyncAt: true },
    });

    console.log(`📅 Updated last sync time: ${updatedAccount?.lastSyncAt}`);

    // Check if any threads were created
    const threadCount = await prisma.thread.count({
      where: { emailAccountId: account.id },
    });

    console.log(`📧 Total threads for this account: ${threadCount}`);

  } catch (error) {
    console.error('❌ Sync test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();