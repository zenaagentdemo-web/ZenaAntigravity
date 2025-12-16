#!/usr/bin/env node

/**
 * Re-classify Existing Emails
 * Uses the improved AI classification to re-process existing emails
 */

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { AIProcessingService } from '../src/services/ai-processing.service.js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();
const aiService = new AIProcessingService();

async function reclassifyEmails() {
  console.log('🔄 Re-classifying emails with improved AI...\n');

  try {
    // Get all threads that need reclassification
    const threads = await prisma.thread.findMany({
      select: {
        id: true,
        subject: true,
        classification: true,
        category: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (threads.length === 0) {
      console.log('❌ No threads found to reclassify.');
      return;
    }

    console.log(`📊 Found ${threads.length} threads to reclassify...\n`);

    let processed = 0;
    let reclassified = 0;
    let errors = 0;

    for (const thread of threads) {
      try {
        console.log(`Processing: "${thread.subject.substring(0, 60)}..."`);
        
        const oldClassification = thread.classification;
        const oldCategory = thread.category;

        // Re-process the thread
        await aiService.processThread(thread.id);
        
        // Check if classification changed
        const updatedThread = await prisma.thread.findUnique({
          where: { id: thread.id },
          select: { classification: true, category: true },
        });

        if (updatedThread && 
            (updatedThread.classification !== oldClassification || 
             updatedThread.category !== oldCategory)) {
          console.log(`  ✅ ${oldClassification}/${oldCategory} → ${updatedThread.classification}/${updatedThread.category}`);
          reclassified++;
        } else {
          console.log(`  ➡️  No change (${oldClassification}/${oldCategory})`);
        }

        processed++;
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Error processing thread: ${error}`);
        errors++;
      }
    }

    console.log('\n📊 RECLASSIFICATION SUMMARY:');
    console.log(`   Total processed: ${processed}`);
    console.log(`   Reclassified: ${reclassified}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Unchanged: ${processed - reclassified - errors}`);

    if (reclassified > 0) {
      console.log('\n🎉 Reclassification complete! Check your Focus and Waiting pages.');
      console.log('💡 You should now see fewer non-real estate emails in your lists.');
    }

  } catch (error) {
    console.error('❌ Error during reclassification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reclassifyEmails();