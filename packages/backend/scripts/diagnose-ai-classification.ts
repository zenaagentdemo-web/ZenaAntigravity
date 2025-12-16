#!/usr/bin/env node

/**
 * Diagnose AI Classification
 * Checks how Zena's brain is currently classifying emails
 */

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function diagnoseClassification() {
  console.log('🧠 Diagnosing Zena\'s AI Classification...\n');

  try {
    // Get recent threads to analyze
    const threads = await prisma.thread.findMany({
      take: 20,
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        subject: true,
        classification: true,
        category: true,
        summary: true,
        participants: true,
        lastMessageAt: true,
      },
    });

    if (threads.length === 0) {
      console.log('❌ No threads found. Make sure you have synced some emails first.');
      return;
    }

    console.log(`📊 Found ${threads.length} recent threads. Analyzing classification...\n`);

    // Group by classification
    const byClassification = threads.reduce((acc, thread) => {
      const classification = thread.classification || 'unclassified';
      if (!acc[classification]) acc[classification] = [];
      acc[classification].push(thread);
      return acc;
    }, {} as Record<string, any[]>);

    // Group by category
    const byCategory = threads.reduce((acc, thread) => {
      const category = thread.category || 'uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(thread);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('🏷️  CLASSIFICATION BREAKDOWN:');
    Object.entries(byClassification).forEach(([classification, threads]) => {
      console.log(`   ${classification.toUpperCase()}: ${threads.length} threads`);
      threads.slice(0, 3).forEach(thread => {
        console.log(`     • "${thread.subject.substring(0, 60)}..."`);
      });
      if (threads.length > 3) {
        console.log(`     ... and ${threads.length - 3} more`);
      }
      console.log('');
    });

    console.log('📂 CATEGORY BREAKDOWN:');
    Object.entries(byCategory).forEach(([category, threads]) => {
      console.log(`   ${category.toUpperCase()}: ${threads.length} threads`);
      threads.slice(0, 3).forEach(thread => {
        console.log(`     • "${thread.subject.substring(0, 60)}..."`);
      });
      if (threads.length > 3) {
        console.log(`     ... and ${threads.length - 3} more`);
      }
      console.log('');
    });

    // Identify potential misclassifications
    console.log('🔍 POTENTIAL ISSUES:');
    
    const noiseInFocus = threads.filter(t => 
      t.category === 'focus' && 
      (t.subject.toLowerCase().includes('newsletter') ||
       t.subject.toLowerCase().includes('unsubscribe') ||
       t.subject.toLowerCase().includes('marketing') ||
       t.subject.toLowerCase().includes('security alert') ||
       t.subject.toLowerCase().includes('report') ||
       t.subject.toLowerCase().includes('data'))
    );

    if (noiseInFocus.length > 0) {
      console.log(`   ⚠️  ${noiseInFocus.length} potential NOISE emails in FOCUS:`);
      noiseInFocus.forEach(thread => {
        console.log(`     • "${thread.subject}" (${thread.classification})`);
      });
      console.log('');
    }

    const realEstateInNoise = threads.filter(t => 
      t.classification === 'noise' && 
      (t.subject.toLowerCase().includes('property') ||
       t.subject.toLowerCase().includes('listing') ||
       t.subject.toLowerCase().includes('buy') ||
       t.subject.toLowerCase().includes('sell') ||
       t.subject.toLowerCase().includes('real estate') ||
       t.subject.toLowerCase().includes('viewing'))
    );

    if (realEstateInNoise.length > 0) {
      console.log(`   ⚠️  ${realEstateInNoise.length} potential REAL ESTATE emails classified as NOISE:`);
      realEstateInNoise.forEach(thread => {
        console.log(`     • "${thread.subject}"`);
      });
      console.log('');
    }

    // Check if AI processing is working
    const unclassified = threads.filter(t => !t.classification || t.classification === 'noise');
    const hasAIProcessing = threads.some(t => t.classification && t.classification !== 'noise');

    console.log('🤖 AI PROCESSING STATUS:');
    if (hasAIProcessing) {
      console.log('   ✅ AI classification is working');
      console.log(`   📊 ${threads.length - unclassified.length}/${threads.length} threads have been AI-processed`);
    } else {
      console.log('   ❌ AI classification may not be working');
      console.log('   💡 All threads are unclassified or marked as noise');
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    if (noiseInFocus.length > 0) {
      console.log('   1. Improve noise detection for newsletters, alerts, and reports');
    }
    if (realEstateInNoise.length > 0) {
      console.log('   2. Improve real estate detection for buyer/vendor emails');
    }
    if (!hasAIProcessing) {
      console.log('   3. Check if AI processing service is running during email sync');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseClassification();