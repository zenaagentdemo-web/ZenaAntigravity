#!/usr/bin/env tsx

/**
 * Test automatic contact creation from email participants
 */

import { PrismaClient } from '@prisma/client';
import { contactAutoCreationService } from '../src/services/contact-auto-creation.service.js';

const prisma = new PrismaClient();

async function testContactAutoCreation() {
  console.log('🧪 Testing Automatic Contact Creation...\n');

  try {
    // Get the demo user
    const user = await prisma.user.findUnique({
      where: { email: 'demo@zena.ai' }
    });

    if (!user) {
      console.error('❌ Demo user not found. Run: npx prisma db seed');
      process.exit(1);
    }

    console.log(`📋 Using demo user: ${user.email} (ID: ${user.id})\n`);

    // Test 1: Create contacts from typical real estate email participants
    console.log('📧 Test 1: Creating contacts from buyer inquiry email');
    const buyerParticipants = [
      'demo@zena.ai', // User's own email (should be skipped)
      'Michael Johnson <michael.johnson@gmail.com>', // Potential buyer
      'Lisa Chen <lisa.chen@outlook.com>' // Another potential buyer
    ];

    await contactAutoCreationService.createContactsFromParticipants(
      user.id,
      buyerParticipants,
      'demo@zena.ai'
    );

    // Test 2: Create contacts from vendor email
    console.log('📧 Test 2: Creating contacts from vendor email');
    const vendorParticipants = [
      'demo@zena.ai',
      'Robert Smith <robert.smith@yahoo.com>' // Potential vendor
    ];

    await contactAutoCreationService.createContactsFromParticipants(
      user.id,
      vendorParticipants,
      'demo@zena.ai'
    );

    // Test 3: Create contacts from professional email
    console.log('📧 Test 3: Creating contacts from legal professional email');
    const professionalParticipants = [
      'demo@zena.ai',
      'Jennifer Law <j.law@lawfirm.com.au>' // Legal professional
    ];

    await contactAutoCreationService.createContactsFromParticipants(
      user.id,
      professionalParticipants,
      'demo@zena.ai'
    );

    // Test 4: Test role updates based on email content
    console.log('📧 Test 4: Testing role updates based on email content');
    
    await contactAutoCreationService.updateContactRoleFromContext(
      user.id,
      'michael.johnson@gmail.com',
      'Interested in buying property',
      'Hi, I am very interested in purchasing the property at 123 Main Street. Could we arrange a viewing?'
    );

    await contactAutoCreationService.updateContactRoleFromContext(
      user.id,
      'robert.smith@yahoo.com',
      'Want to sell my house',
      'I am looking to sell my property and would like to discuss listing it with your agency.'
    );

    // Show results
    console.log('\n📊 Final contact list:');
    const allContacts = await prisma.contact.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        emails: true,
        role: true,
        relationshipNotes: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    allContacts.forEach(contact => {
      console.log(`   • ${contact.name} (${contact.role}) - ${contact.emails[0]}`);
      if (contact.relationshipNotes && Array.isArray(contact.relationshipNotes)) {
        const notes = contact.relationshipNotes as any[];
        const latestNote = notes[notes.length - 1];
        if (latestNote) {
          console.log(`     Note: ${latestNote.content}`);
        }
      }
    });

    console.log(`\n✅ Test completed! Created ${allContacts.length} total contacts.`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testContactAutoCreation().catch(console.error);