#!/usr/bin/env tsx

/**
 * Simulate creating a contact from a Focus page email sender
 */

import { PrismaClient } from '@prisma/client';
import { contactAutoCreationService } from '../src/services/contact-auto-creation.service.js';

const prisma = new PrismaClient();

async function simulateFocusEmailContact() {
  console.log('📧 Simulating Focus Email Contact Creation...\n');

  try {
    // Get the demo user
    const user = await prisma.user.findUnique({
      where: { email: 'demo@zena.ai' }
    });

    if (!user) {
      console.error('❌ Demo user not found. Run: npx prisma db seed');
      process.exit(1);
    }

    // Get a Focus thread to see who the sender is
    const focusThread = await prisma.thread.findFirst({
      where: {
        userId: user.id,
        category: 'focus'
      },
      select: {
        id: true,
        subject: true,
        participants: true,
        summary: true
      }
    });

    if (!focusThread) {
      console.log('❌ No Focus threads found. The seed data may not be loaded.');
      return;
    }

    console.log(`📋 Found Focus thread: "${focusThread.subject}"`);
    console.log(`📋 Participants: ${focusThread.participants.join(', ')}`);

    // Create contacts from this thread's participants
    console.log('\n📧 Creating contacts from Focus thread participants...');
    
    await contactAutoCreationService.createContactsFromParticipants(
      user.id,
      focusThread.participants,
      'demo@zena.ai'
    );

    // Update roles based on the thread content
    for (const participant of focusThread.participants) {
      if (participant.toLowerCase() !== 'demo@zena.ai') {
        const emailMatch = participant.match(/<(.+?)>/) || [null, participant];
        const email = emailMatch[1] || participant;
        
        console.log(`🔄 Analyzing email content for: ${email}`);
        
        await contactAutoCreationService.updateContactRoleFromContext(
          user.id,
          email,
          focusThread.subject,
          focusThread.summary
        );
      }
    }

    // Show the updated contact list
    console.log('\n📊 Updated contact list:');
    const allContacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        emails: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    allContacts.forEach(contact => {
      const isNew = new Date(contact.createdAt).getTime() > Date.now() - 60000; // Created in last minute
      const indicator = isNew ? '🆕' : '  ';
      console.log(`${indicator} ${contact.name} (${contact.role}) - ${contact.emails[0]}`);
    });

    console.log(`\n✅ Simulation completed! Total contacts: ${allContacts.length}`);
    console.log('🆕 = Newly created contacts');

  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the simulation
simulateFocusEmailContact().catch(console.error);