#!/usr/bin/env tsx

/**
 * Fix Contact Auto-Creation
 * This script runs contact auto-creation on existing threads with the fixed logic
 */

import { PrismaClient } from '@prisma/client';
import { contactAutoCreationService } from '../src/services/contact-auto-creation.service.js';

const prisma = new PrismaClient();

async function fixContactCreation() {
  console.log('🔧 Fixing Contact Auto-Creation...\n');

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

    // Get all threads for this user
    const threads = await prisma.thread.findMany({
      where: { 
        userId: user.id,
        emailAccountId: gmailAccount.id
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    console.log(`📨 Found ${threads.length} threads to process\n`);

    // Process each thread to create contacts
    let contactsCreated = 0;
    
    for (const thread of threads) {
      console.log(`Processing: "${thread.subject}"`);
      console.log(`  Participants:`, thread.participants);

      try {
        // Run contact auto-creation with fixed logic
        await contactAutoCreationService.createContactsFromParticipants(
          user.id,
          thread.participants,
          gmailAccount.email
        );

        // Also update contact roles based on email content
        if (Array.isArray(thread.participants)) {
          for (const participant of thread.participants) {
            let email: string;
            
            // Handle different participant formats
            if (typeof participant === 'string') {
              const emailMatch = participant.match(/<(.+?)>/) || [null, participant];
              email = emailMatch[1] || participant;
            } else if (typeof participant === 'object' && participant.email) {
              email = participant.email;
            } else {
              continue;
            }

            if (email.toLowerCase() !== gmailAccount.email.toLowerCase()) {
              await contactAutoCreationService.updateContactRoleFromContext(
                user.id,
                email,
                thread.subject,
                thread.summary
              );
            }
          }
        }

        contactsCreated++;
      } catch (error) {
        console.error(`  Error processing thread: ${error}`);
      }

      console.log('  ✅ Processed\n');
    }

    // Check what contacts were created
    console.log('📋 Checking created contacts...\n');
    
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Total contacts: ${contacts.length}`);
    contacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.name} (${contact.emails[0]}) - Role: ${contact.role}`);
    });

    console.log('\n🎉 Contact auto-creation fix completed!');
    console.log(`📊 Processed ${contactsCreated} threads`);
    console.log(`👥 Total contacts: ${contacts.length}`);

  } catch (error) {
    console.error('❌ Error fixing contact creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixContactCreation().catch(console.error);