#!/usr/bin/env tsx

/**
 * Check Focus Threads
 * This script shows what threads should appear in Focus vs Waiting
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFocusThreads() {
  console.log('🔍 Checking Focus vs Waiting Threads...\n');

  try {
    // Get the user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found.');
      return;
    }

    // Get Focus threads
    const focusThreads = await prisma.thread.findMany({
      where: { 
        userId: user.id,
        classification: 'focus'
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    console.log(`🎯 FOCUS THREADS (${focusThreads.length}):`);
    focusThreads.forEach((thread, index) => {
      console.log(`   ${index + 1}. "${thread.subject}" (${thread.category})`);
      console.log(`      Participants: ${JSON.stringify(thread.participants)}`);
      console.log('');
    });

    // Get Waiting threads
    const waitingThreads = await prisma.thread.findMany({
      where: { 
        userId: user.id,
        classification: 'waiting'
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10 // Just show first 10
    });

    console.log(`⏳ WAITING THREADS (showing first 10 of many):`);
    waitingThreads.forEach((thread, index) => {
      console.log(`   ${index + 1}. "${thread.subject}" (${thread.category})`);
    });

    // Get all classifications
    const classifications = await prisma.thread.groupBy({
      by: ['classification'],
      where: { userId: user.id },
      _count: { classification: true }
    });

    console.log('\n📊 THREAD CLASSIFICATIONS:');
    classifications.forEach(c => {
      console.log(`   ${c.classification}: ${c._count.classification} threads`);
    });

  } catch (error) {
    console.error('❌ Error checking focus threads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkFocusThreads().catch(console.error);