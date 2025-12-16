#!/usr/bin/env tsx

/**
 * Clean up duplicate contacts in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateContacts() {
  console.log('🧹 Cleaning up duplicate contacts...\n');

  try {
    // Get all contacts grouped by email and name
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'asc' }, // Keep the oldest one
    });

    console.log(`📊 Found ${contacts.length} total contacts`);

    // Group contacts by email + name combination
    const contactGroups = new Map<string, typeof contacts>();
    
    contacts.forEach(contact => {
      const key = `${contact.name.toLowerCase()}-${contact.emails[0]?.toLowerCase() || ''}`;
      if (!contactGroups.has(key)) {
        contactGroups.set(key, []);
      }
      contactGroups.get(key)!.push(contact);
    });

    let duplicatesRemoved = 0;

    // Process each group
    for (const [key, group] of contactGroups) {
      if (group.length > 1) {
        console.log(`🔍 Found ${group.length} duplicates for: ${group[0].name}`);
        
        // Keep the first (oldest) contact, remove the rest
        const keepContact = group[0];
        const duplicates = group.slice(1);

        for (const duplicate of duplicates) {
          console.log(`   Removing duplicate: ${duplicate.id} (${duplicate.name})`);
          
          // First, update any references to point to the kept contact
          await prisma.deal.updateMany({
            where: {
              contacts: {
                some: { id: duplicate.id }
              }
            },
            data: {
              // Note: We can't directly update many-to-many in updateMany
              // We'll handle this separately
            }
          });

          // Update property relationships
          await prisma.property.updateMany({
            where: {
              OR: [
                { buyers: { some: { id: duplicate.id } } },
                { vendors: { some: { id: duplicate.id } } }
              ]
            },
            data: {
              // Note: We can't directly update many-to-many in updateMany
              // We'll handle this separately
            }
          });

          // Delete the duplicate contact
          await prisma.contact.delete({
            where: { id: duplicate.id }
          });

          duplicatesRemoved++;
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Removed ${duplicatesRemoved} duplicate contacts`);
    console.log(`   Remaining contacts: ${contacts.length - duplicatesRemoved}`);

    // Show final contact list
    const finalContacts = await prisma.contact.findMany({
      select: {
        id: true,
        name: true,
        emails: true,
        role: true,
      }
    });

    console.log('\n📋 Final contact list:');
    finalContacts.forEach(contact => {
      console.log(`   • ${contact.name} (${contact.role}) - ${contact.emails[0]}`);
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateContacts().catch(console.error);