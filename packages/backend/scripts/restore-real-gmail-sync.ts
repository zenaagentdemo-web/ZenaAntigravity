#!/usr/bin/env tsx

/**
 * Restore Real Gmail Sync
 * This script removes the fake test data and triggers a fresh Gmail sync
 */

import { PrismaClient } from '@prisma/client';
import { syncEngineService } from '../src/services/sync-engine.service.js';

const prisma = new PrismaClient();

async function restoreRealGmailSync() {
  console.log('🔄 Restoring Real Gmail Sync...\n');

  try {
    // Get the user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found.');
      return;
    }

    console.log(`👤 User: ${user.email}\n`);

    // Get Gmail account
    const gmailAccount = await prisma.emailAccount.findFirst({
      where: { 
        userId: user.id,
        provider: 'gmail'
      }
    });

    if (!gmailAccount) {
      console.error('❌ No Gmail account found.');
      return;
    }

    console.log(`📧 Gmail account: ${gmailAccount.email}\n`);

    // Remove fake test data (threads created by the test script)
    console.log('🧹 Removing fake test data...');
    
    const fakeThreadIds = [
      'thread-001',
      'thread-002', 
      'thread-003'
    ];

    // Delete fake threads and their messages
    for (const externalId of fakeThreadIds) {
      const fakeThread = await prisma.thread.findFirst({
        where: {
          userId: user.id,
          externalId: externalId
        }
      });

      if (fakeThread) {
        console.log(`   Removing fake thread: ${fakeThread.subject}`);
        
        // Delete messages first
        await prisma.message.deleteMany({
          where: { threadId: fakeThread.id }
        });
        
        // Delete thread
        await prisma.thread.delete({
          where: { id: fakeThread.id }
        });
      }
    }

    // Remove fake contacts (those created by the test script)
    console.log('🧹 Removing fake test contacts...');
    
    const fakeEmails = [
      'john.buyer@gmail.com',
      'mary.vendor@yahoo.com',
      'david.lawyer@lawfirm.com',
      'sarah.agent@realestate.com'
    ];

    for (const email of fakeEmails) {
      const fakeContact = await prisma.contact.findFirst({
        where: {
          userId: user.id,
          emails: { has: email }
        }
      });

      if (fakeContact) {
        console.log(`   Removing fake contact: ${fakeContact.name} (${email})`);
        await prisma.contact.delete({
          where: { id: fakeContact.id }
        });
      }
    }

    console.log('✅ Fake test data removed\n');

    // Reset last sync to force a fresh sync
    console.log('🔄 Resetting Gmail sync timestamp to force fresh sync...');
    await prisma.emailAccount.update({
      where: { id: gmailAccount.id },
      data: { lastSyncAt: null }
    });

    console.log('✅ Gmail sync timestamp reset\n');

    // Trigger manual Gmail sync
    console.log('📨 Triggering fresh Gmail sync...');
    
    try {
      const syncResult = await syncEngineService.triggerManualSync(gmailAccount.id);
      
      if (syncResult.success) {
        console.log(`✅ Gmail sync completed successfully!`);
        console.log(`   Processed ${syncResult.threadsProcessed} threads`);
      } else {
        console.log(`⚠️ Gmail sync completed with issues: ${syncResult.error}`);
      }
    } catch (syncError) {
      console.error('❌ Gmail sync failed:', syncError);
      console.log('\n💡 You can manually trigger sync from the Settings page or wait for automatic sync.');
    }

    // Check what real threads we now have
    console.log('\n📋 Checking current threads...');
    
    const realThreads = await prisma.thread.findMany({
      where: { 
        userId: user.id,
        emailAccountId: gmailAccount.id
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 5
    });

    console.log(`✅ Found ${realThreads.length} real threads:`);
    realThreads.forEach((thread, index) => {
      console.log(`   ${index + 1}. "${thread.subject}" (${thread.classification})`);
    });

    // Check real contacts
    console.log('\n📋 Checking current contacts...');
    
    const realContacts = await prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Found ${realContacts.length} contacts:`);
    realContacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.name} (${contact.emails[0]}) - Role: ${contact.role}`);
    });

    console.log('\n🎉 Real Gmail sync restored!');
    console.log('\n💡 Your Focus page should now show your real Gmail threads.');
    console.log('💡 Contacts should be automatically created from real email participants.');

  } catch (error) {
    console.error('❌ Error restoring Gmail sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreRealGmailSync().catch(console.error);