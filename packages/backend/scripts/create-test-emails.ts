#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createTestEmails() {
  try {
    console.log('🔄 Creating test email threads...');
    
    // Get the first email account
    const account = await prisma.emailAccount.findFirst({
      select: {
        id: true,
        email: true,
        userId: true,
      },
    });

    if (!account) {
      console.log('❌ No email accounts found');
      return;
    }

    console.log(`📧 Found account: ${account.email}`);

    // Create some test threads
    const testThreads = [
      {
        subject: 'Property Inquiry - 123 Main Street',
        participants: [
          { name: 'John Buyer', email: 'john.buyer@email.com', role: 'buyer' },
          { name: 'You', email: account.email, role: 'agent' },
        ],
        classification: 'buyer' as const,
        category: 'focus' as const,
        nextActionOwner: 'me' as const,
        riskLevel: 'none' as const,
        summary: 'Potential buyer interested in 123 Main Street. Asking about price and viewing availability.',
        draftResponse: 'Hi John, thank you for your interest in 123 Main Street. The property is priced at $450,000 and I can arrange a viewing this weekend. What time works best for you?',
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        subject: 'Contract Review - 456 Oak Avenue',
        participants: [
          { name: 'Sarah Vendor', email: 'sarah.vendor@email.com', role: 'vendor' },
          { name: 'Legal Team', email: 'legal@lawfirm.com', role: 'lawyer' },
          { name: 'You', email: account.email, role: 'agent' },
        ],
        classification: 'lawyer_broker' as const,
        category: 'waiting' as const,
        nextActionOwner: 'other' as const,
        riskLevel: 'medium' as const,
        riskReason: 'Contract review taking longer than expected - 5 days since last response',
        summary: 'Contract review for 456 Oak Avenue sale. Waiting for legal team to respond to vendor questions.',
        lastMessageAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        lastReplyAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        subject: 'Market Update Request',
        participants: [
          { name: 'Mike Investor', email: 'mike.investor@email.com', role: 'buyer' },
          { name: 'You', email: account.email, role: 'agent' },
        ],
        classification: 'market' as const,
        category: 'focus' as const,
        nextActionOwner: 'me' as const,
        riskLevel: 'low' as const,
        summary: 'Investor requesting market analysis for downtown area. Needs data on recent sales and trends.',
        draftResponse: 'Hi Mike, I\'ve prepared a comprehensive market analysis for the downtown area. Recent sales show a 12% increase in property values over the last quarter. I\'ll send the full report shortly.',
        lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        subject: 'Spam: Get Rich Quick!',
        participants: [
          { name: 'Spammer', email: 'spam@badsite.com', role: 'unknown' },
          { name: 'You', email: account.email, role: 'agent' },
        ],
        classification: 'noise' as const,
        category: 'noise' as const,
        nextActionOwner: 'none' as const,
        riskLevel: 'none' as const,
        summary: 'Spam email about get rich quick schemes. Should be filtered out.',
        lastMessageAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        subject: 'Urgent: Property Settlement Issue',
        participants: [
          { name: 'Emma Vendor', email: 'emma.vendor@email.com', role: 'vendor' },
          { name: 'Bank Representative', email: 'bank@bigbank.com', role: 'other' },
          { name: 'You', email: account.email, role: 'agent' },
        ],
        classification: 'vendor' as const,
        category: 'waiting' as const,
        nextActionOwner: 'other' as const,
        riskLevel: 'high' as const,
        riskReason: 'Settlement delayed due to bank issues - deal at risk of falling through',
        summary: 'Settlement for Emma\'s property delayed due to bank financing issues. Urgent resolution needed.',
        lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        lastReplyAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];

    // Create threads
    for (const threadData of testThreads) {
      const thread = await prisma.thread.create({
        data: {
          userId: account.userId,
          emailAccountId: account.id,
          externalId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          subject: threadData.subject,
          participants: threadData.participants,
          classification: threadData.classification,
          category: threadData.category,
          nextActionOwner: threadData.nextActionOwner,
          riskLevel: threadData.riskLevel,
          riskReason: threadData.riskReason,
          summary: threadData.summary,
          draftResponse: threadData.draftResponse,
          lastMessageAt: threadData.lastMessageAt,
          lastReplyAt: threadData.lastReplyAt,
        },
      });

      console.log(`✅ Created thread: ${thread.subject}`);

      // Create a sample message for each thread
      await prisma.message.create({
        data: {
          threadId: thread.id,
          externalId: `msg-${thread.id}-1`,
          from: threadData.participants[0],
          to: [threadData.participants[1]],
          cc: [],
          subject: threadData.subject,
          body: threadData.summary,
          sentAt: threadData.lastMessageAt,
          receivedAt: threadData.lastMessageAt,
          isFromUser: false,
        },
      });
    }

    // Update the account's last sync time
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date() },
    });

    console.log('✅ Test email threads created successfully!');
    console.log('🎯 You should now see emails in Focus and Waiting pages');

  } catch (error) {
    console.error('❌ Failed to create test emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestEmails();