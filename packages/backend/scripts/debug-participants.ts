#!/usr/bin/env tsx

/**
 * Debug Participants Data Structure
 * This script checks what format the participants field is in
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugParticipants() {
  console.log('🔍 Debugging Participants Data Structure...\n');

  try {
    // Get a few threads to see the participants structure
    const threads = await prisma.thread.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${threads.length} threads to examine:\n`);

    threads.forEach((thread, index) => {
      console.log(`Thread ${index + 1}: "${thread.subject}"`);
      console.log(`  Participants type: ${typeof thread.participants}`);
      console.log(`  Participants value:`, thread.participants);
      console.log(`  Is array: ${Array.isArray(thread.participants)}`);
      
      if (Array.isArray(thread.participants)) {
        console.log(`  Array length: ${thread.participants.length}`);
        thread.participants.forEach((p, i) => {
          console.log(`    [${i}] Type: ${typeof p}, Value: ${p}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging participants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugParticipants().catch(console.error);