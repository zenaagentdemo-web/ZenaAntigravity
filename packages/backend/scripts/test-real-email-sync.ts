#!/usr/bin/env tsx

/**
 * Test Real Email Sync with Contact Auto-Creation
 * This script simulates receiving real emails and tests if contacts are automatically created
 */

import { PrismaClient } from '@prisma/client';
import { contactAutoCreationService } from '../src/services/contact-auto-creation.service.js';
import { syncEngineService } from '../src/services/sync-engine.service.js';

const prisma = new PrismaClient();

async function testRealEmailSync() {
  console.log('🧪 Testing Real Email Sync with Contact Auto-Creation...\n');

  try {
    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found. Please run the seed script first.');
      return;
    }

    console.log(`👤 Testing with user: ${user.email}\n`);

    // Get user's email account
    const emailAccount = await prisma.emailAccount.findFirst({
      where: { userId: user.id }
    });

    if (!emailAccount) {
      console.error('❌ No email account found for user.');
      return;
    }

    console.log(`📧 Using email account: ${emailAccount.email}\n`);

    // Clear existing contacts to test fresh
    console.log('🧹 Clearing existing contacts...');
    await prisma.contact.deleteMany({
      where: { userId: user.id }
    });

    // Clear existing threads to test fresh
    console.log('🧹 Clearing existing threads...');
    await prisma.thread.deleteMany({
      where: { userId: user.id }
    });

    console.log('✅ Cleared existing data\n');

    // Simulate realistic email threads with real-looking participants
    const mockThreads = [
      {
        externalId: 'thread-001',
        subject: 'Interested in buying your property at 123 Oak Street',
        participants: [
          emailAccount.email, // User's email
          'john.buyer@gmail.com', // Potential buyer
          'sarah.agent@realestate.com' // Real estate agent
        ],
        lastMessageAt: new Date(),
        summary: 'John Smith is interested in purchasing the property at 123 Oak Street. He would like to schedule a viewing and discuss the asking price.',
        messages: [
          {
            externalId: 'msg-001',
            from: { email: 'john.buyer@gmail.com', name: 'John Smith' },
            to: [{ email: emailAccount.email, name: user.name }],
            cc: [],
            subject: 'Interested in buying your property at 123 Oak Street',
            body: 'Hi, I saw your listing for 123 Oak Street and I\'m very interested in buying it. Could we schedule a viewing?',
            bodyHtml: '<p>Hi, I saw your listing for 123 Oak Street and I\'m very interested in buying it. Could we schedule a viewing?</p>',
            sentAt: new Date(),
            receivedAt: new Date(),
            isFromUser: false
          }
        ]
      },
      {
        externalId: 'thread-002',
        subject: 'Want to sell my house - need an agent',
        participants: [
          emailAccount.email,
          'mary.vendor@yahoo.com'
        ],
        lastMessageAt: new Date(),
        summary: 'Mary Johnson wants to sell her house and is looking for a real estate agent to help with the listing.',
        messages: [
          {
            externalId: 'msg-002',
            from: { email: 'mary.vendor@yahoo.com', name: 'Mary Johnson' },
            to: [{ email: emailAccount.email, name: user.name }],
            cc: [],
            subject: 'Want to sell my house - need an agent',
            body: 'Hello, I\'m looking to sell my property and would like to discuss your services as a listing agent.',
            bodyHtml: '<p>Hello, I\'m looking to sell my property and would like to discuss your services as a listing agent.</p>',
            sentAt: new Date(),
            receivedAt: new Date(),
            isFromUser: false
          }
        ]
      },
      {
        externalId: 'thread-003',
        subject: 'Legal documents for property transfer',
        participants: [
          emailAccount.email,
          'david.lawyer@lawfirm.com'
        ],
        lastMessageAt: new Date(),
        summary: 'David Wilson from the law firm is handling the legal documents for a property transfer.',
        messages: [
          {
            externalId: 'msg-003',
            from: { email: 'david.lawyer@lawfirm.com', name: 'David Wilson' },
            to: [{ email: emailAccount.email, name: user.name }],
            cc: [],
            subject: 'Legal documents for property transfer',
            body: 'Please find attached the legal documents for the property transfer. Let me know if you have any questions.',
            bodyHtml: '<p>Please find attached the legal documents for the property transfer. Let me know if you have any questions.</p>',
            sentAt: new Date(),
            receivedAt: new Date(),
            isFromUser: false
          }
        ]
      }
    ];

    console.log('📨 Simulating email sync with realistic threads...\n');

    // Simulate the sync engine storing these threads
    const storedThreadIds: string[] = [];

    for (const thread of mockThreads) {
      console.log(`📧 Processing thread: "${thread.subject}"`);
      console.log(`   Participants: ${thread.participants.join(', ')}`);

      // Create the thread
      const newThread = await prisma.thread.create({
        data: {
          userId: user.id,
          emailAccountId: emailAccount.id,
          externalId: thread.externalId,
          subject: thread.subject,
          participants: thread.participants,
          classification: 'focus', // Mark as focus to appear in Focus page
          category: 'waiting',
          nextActionOwner: 'other',
          lastMessageAt: thread.lastMessageAt,
          summary: thread.summary,
        },
      });

      storedThreadIds.push(newThread.id);

      // Store messages
      for (const message of thread.messages) {
        await prisma.message.create({
          data: {
            threadId: newThread.id,
            externalId: message.externalId,
            from: message.from,
            to: message.to,
            cc: message.cc,
            subject: message.subject,
            body: message.body,
            bodyHtml: message.bodyHtml,
            sentAt: message.sentAt,
            receivedAt: message.receivedAt,
            isFromUser: message.isFromUser,
          },
        });
      }

      // Now trigger contact auto-creation (this is what should happen during sync)
      console.log('   🤖 Auto-creating contacts from participants...');
      
      await contactAutoCreationService.createContactsFromParticipants(
        user.id,
        thread.participants,
        emailAccount.email
      );

      // Update contact roles based on email content
      for (const participant of thread.participants) {
        if (participant.toLowerCase() !== emailAccount.email.toLowerCase()) {
          const emailMatch = participant.match(/<(.+?)>/) || [null, participant];
          const email = emailMatch[1] || participant;
          
          await contactAutoCreationService.updateContactRoleFromContext(
            user.id,
            email,
            thread.subject,
            thread.summary
          );
        }
      }

      console.log('   ✅ Thread processed\n');
    }

    // Check what contacts were created
    console.log('📋 Checking created contacts...\n');
    
    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Created ${contacts.length} contacts:`);
    contacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.name} (${contact.emails[0]}) - Role: ${contact.role}`);
    });

    // Check threads in Focus
    console.log('\n📋 Checking threads in Focus...\n');
    
    const focusThreads = await prisma.thread.findMany({
      where: { 
        userId: user.id,
        classification: 'focus'
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    console.log(`✅ Found ${focusThreads.length} threads in Focus:`);
    focusThreads.forEach((thread, index) => {
      console.log(`   ${index + 1}. "${thread.subject}" - Participants: ${thread.participants.join(', ')}`);
    });

    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 Now check:');
    console.log('   1. Go to Contacts page - you should see the auto-created contacts');
    console.log('   2. Go to Focus page - you should see emails from those contacts');
    console.log('   3. Ask Zena "Who are my buyers?" - should mention John Smith');
    console.log('   4. Ask Zena "Who wants to sell?" - should mention Mary Johnson');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRealEmailSync().catch(console.error);