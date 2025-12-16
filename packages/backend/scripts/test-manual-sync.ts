#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import { syncEngineService } from '../src/services/sync-engine.service.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testManualSync() {
  try {
    console.log('🔄 Testing manual sync...');
    
    // Get the first email account
    const account = await prisma.emailAccount.findFirst({
      select: {
        id: true,
        email: true,
        provider: true,
        userId: true,
        lastSyncAt: true,
        syncEnabled: true,
      },
    });

    if (!account) {
      console.log('❌ No email accounts found');
      return;
    }

    console.log(`📧 Found account: ${account.email} (${account.provider})`);
    console.log(`🔄 Triggering manual sync for account: ${account.id}`);
    
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
    console.error('❌ Manual sync test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testManualSync();