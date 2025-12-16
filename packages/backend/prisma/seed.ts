import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create a demo user
  const passwordHash = await bcrypt.hash('DemoSecure2024!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@zena.ai' },
    update: {},
    create: {
      email: 'demo@zena.ai',
      passwordHash,
      name: 'Demo Agent',
      preferences: {
        notificationSettings: {
          enabled: true,
          highPriorityThreads: true,
          riskDeals: true,
          calendarReminders: true,
          taskReminders: true,
        },
        voiceSettings: {
          sttProvider: 'openai',
          ttsProvider: 'openai',
          ttsVoice: 'alloy',
          autoPlayResponses: false,
        },
        uiSettings: {
          theme: 'auto',
          focusListSize: 5,
          defaultView: 'focus',
        },
      },
    },
  });

  console.log(`Created demo user: ${user.email}`);

  // Create a sample property
  const property = await prisma.property.create({
    data: {
      userId: user.id,
      address: '123 Main Street, Sydney NSW 2000',
      milestones: [
        {
          id: '1',
          type: 'listing',
          date: new Date('2024-01-15'),
          notes: 'Property listed for sale',
        },
        {
          id: '2',
          type: 'first_open',
          date: new Date('2024-01-20'),
          notes: 'First open house - 15 groups attended',
        },
      ],
    },
  });

  console.log(`Created sample property: ${property.address}`);

  // Create sample contacts
  const buyerContact = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'John Smith',
      emails: ['john.smith@example.com'],
      phones: ['+61400123456'],
      role: 'buyer',
      relationshipNotes: [
        {
          id: '1',
          content: 'First-time buyer, looking for family home',
          source: 'email',
          createdAt: new Date(),
        },
      ],
    },
  });

  const vendorContact = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Sarah Johnson',
      emails: ['sarah.johnson@example.com'],
      phones: ['+61400789012'],
      role: 'vendor',
      relationshipNotes: [
        {
          id: '1',
          content: 'Motivated seller, relocating for work',
          source: 'manual',
          createdAt: new Date(),
        },
      ],
    },
  });

  console.log(`Created sample contacts: ${buyerContact.name}, ${vendorContact.name}`);

  // Link contacts to property
  await prisma.property.update({
    where: { id: property.id },
    data: {
      buyers: {
        connect: { id: buyerContact.id },
      },
      vendors: {
        connect: { id: vendorContact.id },
      },
    },
  });

  // Create a sample deal
  const deal = await prisma.deal.create({
    data: {
      userId: user.id,
      propertyId: property.id,
      stage: 'viewing',
      riskLevel: 'low',
      riskFlags: [],
      nextActionOwner: 'agent',
      nextAction: 'Follow up after viewing',
      summary: 'Buyer interested in property, scheduled viewing',
      contacts: {
        connect: [{ id: buyerContact.id }],
      },
    },
  });

  console.log(`Created sample deal: ${deal.id}`);

  // Create a sample task
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      label: 'Send contract to buyer',
      status: 'open',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      dealId: deal.id,
      source: 'manual',
    },
  });

  console.log(`Created sample task: ${task.label}`);

  // Create a timeline event
  const timelineEvent = await prisma.timelineEvent.create({
    data: {
      userId: user.id,
      type: 'note',
      entityType: 'deal',
      entityId: deal.id,
      summary: 'Initial contact with buyer',
      content: 'Buyer expressed strong interest in the property. Scheduled viewing for next week.',
      timestamp: new Date(),
    },
  });

  console.log(`Created timeline event: ${timelineEvent.summary}`);

  // Create a sample email account
  const emailAccount = await prisma.emailAccount.create({
    data: {
      userId: user.id,
      provider: 'gmail',
      email: 'demo@zena.ai',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  console.log(`Created email account: ${emailAccount.email}`);

  // --- Mock Data Generation for Testing ---

  // 1. Generate 3x Buyer Threads
  const buyerSubjects = [
    'Re: 123 Main Street - Content/Price Inquiry',
    'Offer Submitted - 456 Ocean View',
    'Inspection Questions - 789 Hilltop'
  ];

  for (let i = 0; i < 3; i++) {
    await prisma.thread.create({
      data: {
        userId: user.id,
        emailAccountId: emailAccount.id,
        externalId: `mock-buyer-${i}`,
        subject: buyerSubjects[i],
        participants: [`buyer${i}@example.com`, 'demo@zena.ai'],
        lastMessageAt: new Date(Date.now() - (i + 1) * 3600000), // Staggered times
        summary: `Mock buyer thread ${i + 1}. Inquiry about property features and price guide.`,
        classification: 'buyer',
        category: 'focus',
        riskLevel: 'low', // Explicitly NOT high risk for these base tests
        nextActionOwner: 'agent',
        draftResponse: 'Draft reply for buyer...',
        propertyId: property.id
      }
    });
  }
  console.log('Created 3x Buyer Threads');

  // 2. Generate 3x Vendor Threads
  const vendorSubjects = [
    'Campaign Update - 123 Main Street',
    'Auction Reserve Price Discussion',
    'Feedback from Saturday Open'
  ];

  for (let i = 0; i < 3; i++) {
    await prisma.thread.create({
      data: {
        userId: user.id,
        emailAccountId: emailAccount.id,
        externalId: `mock-vendor-${i}`,
        subject: vendorSubjects[i],
        participants: [`vendor${i}@example.com`, 'demo@zena.ai'],
        lastMessageAt: new Date(Date.now() - (i + 1) * 3600000 * 24), // Days ago
        summary: `Mock vendor thread ${i + 1}. Discussion about sales campaign progress.`,
        classification: 'vendor', // Explicitly 'vendor'
        category: 'focus',
        riskLevel: 'low',
        nextActionOwner: 'agent',
        propertyId: property.id
      }
    });
  }
  console.log('Created 3x Vendor Threads');

  // 3. Generate 3x High Risk Threads (Mix of classifications or noise)
  // We make them distinct from the above to ensure clean counts
  const highRiskSubjects = [
    'URGENT: Settlement Delayed',
    'Contract Rescission Notice',
    'Complaint about Property Damage'
  ];

  for (let i = 0; i < 3; i++) {
    await prisma.thread.create({
      data: {
        userId: user.id,
        emailAccountId: emailAccount.id,
        externalId: `mock-high-risk-${i}`,
        subject: highRiskSubjects[i],
        participants: [`risk${i}@example.com`, 'demo@zena.ai'],
        lastMessageAt: new Date(Date.now() - 30 * 60000), // Very recent
        summary: `Urgent issue requiring immediate attention. Mock high risk ${i + 1}.`,
        classification: 'lawyer_broker', // Can be any classification
        category: 'focus',
        riskLevel: 'high', // THE KEY FILTER CRITERIA
        riskReason: 'Immediate legal/financial risk detected',
        nextActionOwner: 'agent'
      }
    });
  }
  console.log('Created 3x High Risk Threads');

  // Add one "Normal" waiting thread just to have variety
  await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-normal-waiting',
      subject: 'Routine Maintenance Update',
      participants: ['maintenance@example.com'],
      lastMessageAt: new Date(),
      summary: 'Bi-annual smoke alarm check scheduled.',
      classification: 'market',
      category: 'waiting',
      riskLevel: 'low',
      nextActionOwner: 'other'
    }
  });

  console.log('Database seed completed successfully!');
  console.log('\n=== Demo Account ===');
  console.log('Email: demo@zena.ai');
  console.log('Password: DemoSecure2024!');
  console.log('\nYou can now log in and test the Focus and Waiting features!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
