import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean up existing data
  console.log('Cleaning up existing data...');
  await prisma.timelineEvent.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.thread.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.emailAccount.deleteMany({});
  await prisma.user.deleteMany({ where: { email: 'demo@zena.ai' } });

  // Create a demo user
  const passwordHash = await bcrypt.hash('DemoSecure2024!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@zena.ai' },
    update: {
      passwordHash,
    },
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

  // Create sample properties
  const property = await prisma.property.create({
    data: {
      userId: user.id,
      address: '123 Main Street, Sydney NSW 2000',
      type: 'residential',
      status: 'active',
      listingPrice: 1250000,
      bedrooms: 4,
      bathrooms: 2,
      landSize: '650 sqm',
      listingDate: new Date('2024-01-10'),
      rateableValue: 1150000,
      viewingCount: 24,
      inquiryCount: 42,
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

  const propertyUnderContract = await prisma.property.create({
    data: {
      userId: user.id,
      address: '45 Harbour View Drive, Mosman NSW 2088',
      type: 'residential',
      status: 'under_contract',
      listingPrice: 3450000,
      bedrooms: 5,
      bathrooms: 3,
      landSize: '850 sqm',
      listingDate: new Date('2023-12-15'),
      rateableValue: 3200000,
      viewingCount: 12,
      inquiryCount: 18,
      milestones: [
        { id: '1', type: 'listing', date: new Date('2024-01-05'), notes: 'Listed' },
        { id: '2', type: 'offer_received', date: new Date('2024-01-25'), notes: 'Offer accepted' }
      ]
    }
  });

  const propertySold = await prisma.property.create({
    data: {
      userId: user.id,
      address: '7a Garden Lane, Surry Hills NSW 2010',
      type: 'residential',
      status: 'sold',
      listingPrice: 1850000,
      bedrooms: 3,
      bathrooms: 2,
      landSize: '210 sqm',
      listingDate: new Date('2023-10-20'),
      rateableValue: 1750000,
      viewingCount: 35,
      inquiryCount: 55,
      milestones: [
        { id: '1', type: 'listing', date: new Date('2023-11-01'), notes: 'Listed' },
        { id: '2', type: 'settled', date: new Date('2023-12-20'), notes: 'Settled' }
      ]
    }
  });

  const propertyCommercial = await prisma.property.create({
    data: {
      userId: user.id,
      address: 'Shop 4, 100 George St, Sydney NSW 2000',
      type: 'commercial',
      status: 'active',
      listingPrice: 890000,
      landSize: '45 sqm',
      listingDate: new Date('2024-02-01'),
      rateableValue: 850000,
      viewingCount: 5,
      inquiryCount: 8,
      milestones: []
    }
  });

  console.log(`Created sample property: ${property.address}`);

  // 5. Withdrawn Property - Difficult Vendor
  const propertyWithdrawn = await prisma.property.create({
    data: {
      userId: user.id,
      address: '22 Cliff Road, Dover Heights NSW 2030',
      type: 'residential',
      status: 'withdrawn',
      listingPrice: 5500000,
      bedrooms: 5,
      bathrooms: 4,
      landSize: '600 sqm',
      listingDate: new Date('2023-08-15'),
      rateableValue: 5200000,
      viewingCount: 8,
      inquiryCount: 12,
      milestones: [
        { id: '1', type: 'listing', date: new Date('2023-09-01'), notes: 'Listed high at vendor request' },
        { id: '2', type: 'price_adjustment', date: new Date('2023-10-15'), notes: 'Reduced by $200k' },
        { id: '3', type: 'withdrawn', date: new Date('2023-12-01'), notes: 'Vendor withdrew from market' }
      ]
    }
  });

  // 6. Vacant Land
  const propertyLand = await prisma.property.create({
    data: {
      userId: user.id,
      address: 'Lot 4, 56 Valley Road, Kumeu AUK',
      type: 'land',
      status: 'active',
      listingPrice: 850000,
      landSize: '1.2 ha',
      listingDate: new Date('2024-01-20'),
      rateableValue: 800000,
      viewingCount: 15,
      inquiryCount: 22,
      milestones: [
        { id: '1', type: 'listing', date: new Date('2024-02-01'), notes: 'New title issued' }
      ]
    }
  });

  // 7. Luxury Penthouse
  const propertyLuxury = await prisma.property.create({
    data: {
      userId: user.id,
      address: 'Penthouse 3, 1 Barangaroo Avenue, Sydney NSW 2000',
      type: 'residential',
      status: 'active',
      listingPrice: 12000000,
      bedrooms: 3,
      bathrooms: 3,
      landSize: '280 sqm',
      listingDate: new Date('2024-02-01'),
      rateableValue: 11000000,
      viewingCount: 3,
      inquiryCount: 7,
      milestones: [
        { id: '1', type: 'listing', date: new Date('2024-02-10'), notes: 'Off-market campaign started' }
      ]
    }
  });

  // 8. Investment Unit
  const propertyInvestment = await prisma.property.create({
    data: {
      userId: user.id,
      address: 'Unit 402, 55 Symonds Street, Auckland CBD',
      type: 'residential',
      status: 'active',
      listingPrice: 450000,
      bedrooms: 2,
      bathrooms: 1,
      landSize: '55 sqm',
      listingDate: new Date('2024-02-05'),
      rateableValue: 420000,
      viewingCount: 28,
      inquiryCount: 45,
      milestones: []
    }
  });

  // 9. Renovator's Delight
  const propertyRenovator = await prisma.property.create({
    data: {
      userId: user.id,
      address: '14 Rust Avenue, Redfern NSW 2016',
      type: 'residential',
      status: 'active',
      listingPrice: 1100000,
      bedrooms: 2,
      bathrooms: 1,
      landSize: '120 sqm',
      listingDate: new Date('2024-02-10'),
      rateableValue: 1050000,
      viewingCount: 42,
      inquiryCount: 68,
      milestones: [
        { id: '1', type: 'listing', date: new Date('2024-02-15'), notes: 'Executors sale' }
      ]
    }
  });

  // 10. Lifestyle Block
  const propertyRural = await prisma.property.create({
    data: {
      userId: user.id,
      address: '88 Country Lane, Coatesville AUK',
      type: 'lifestyle',
      status: 'active',
      listingPrice: 3200000,
      bedrooms: 5,
      bathrooms: 3,
      landSize: '2.5 ha',
      listingDate: new Date('2024-01-01'),
      rateableValue: 3000000,
      viewingCount: 18,
      inquiryCount: 31,
      milestones: []
    }
  });

  console.log('Created 10 sample properties');

  // ====================================================
  // CREATE MOCK VENDORS FOR ALL PROPERTIES
  // ====================================================
  const mockVendors = [
    { firstName: 'Margaret', lastName: 'Thompson', email: 'margaret.thompson@gmail.com', phone: '+61 412 345 678', propertyId: property.id },
    { firstName: 'Robert', lastName: 'Harrison', email: 'robert.harrison@outlook.com', phone: '+61 423 567 890', propertyId: propertyUnderContract.id },
    { firstName: 'Catherine', lastName: 'Mills', email: 'catherine.mills@yahoo.com', phone: '+61 434 789 012', propertyId: propertySold.id },
    { firstName: 'David', lastName: 'Chen', email: 'david.chen@hotmail.com', phone: '+61 445 012 345', propertyId: propertyCommercial.id },
    { firstName: 'Patricia', lastName: 'O\'Brien', email: 'patricia.obrien@gmail.com', phone: '+61 456 234 567', propertyId: propertyWithdrawn.id },
    { firstName: 'Michael', lastName: 'Walker', email: 'michael.walker@icloud.com', phone: '+64 21 345 6789', propertyId: propertyLand.id },
    { firstName: 'Elizabeth', lastName: 'Chang', email: 'elizabeth.chang@gmail.com', phone: '+61 467 456 789', propertyId: propertyLuxury.id },
    { firstName: 'James', lastName: 'Patel', email: 'james.patel@xtra.co.nz', phone: '+64 22 456 7890', propertyId: propertyInvestment.id },
    { firstName: 'Susan', lastName: 'Williams', email: 'susan.williams@outlook.com', phone: '+61 478 678 901', propertyId: propertyRenovator.id },
    { firstName: 'Richard', lastName: 'Taylor', email: 'richard.taylor@gmail.com', phone: '+64 27 567 8901', propertyId: propertyRural.id },
  ];

  for (const vendorData of mockVendors) {
    const vendor = await prisma.contact.create({
      data: {
        userId: user.id,
        name: `${vendorData.firstName} ${vendorData.lastName}`,
        emails: [vendorData.email],
        phones: [vendorData.phone],
        role: 'vendor',
        intelligenceSnippet: `Property vendor - active listing`,
      },
    });

    await prisma.property.update({
      where: { id: vendorData.propertyId },
      data: {
        vendors: {
          connect: { id: vendor.id },
        },
      },
    });
  }

  console.log('Created and linked 10 mock vendors to properties');

  // Create sample contacts - 10 diverse contacts with varying stages
  const buyerContact = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'John Smith',
      emails: ['john.smith@example.com'],
      phones: ['+64212345678'],
      role: 'buyer',
      intelligenceSnippet: 'First-home buyer. Pre-approval valid for 60 days. High urgency.',
      lastActivityDetail: 'Inquired about 24 Ponsonby Road, Ponsonby',
      lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      relationshipNotes: [
        { id: '1', content: 'First-time buyer, looking for family home', source: 'email', createdAt: new Date() },
      ],
    },
  });

  const vendorContact = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Sarah Johnson',
      emails: ['sarah.johnson@example.com'],
      phones: ['+64217890123'],
      role: 'vendor',
      intelligenceSnippet: 'Downsizing vendor. Exploring smaller apartments in Mission Bay.',
      lastActivityDetail: 'Requested appraisal for current property',
      lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      relationshipNotes: [
        { id: '1', content: 'Motivated seller, relocating for work', source: 'manual', createdAt: new Date() },
      ],
    },
  });

  // Additional contacts with diverse profiles
  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Mason Anderson',
      emails: ['mason.anderson@yahoo.co.nz'],
      phones: ['+64211234567'],
      role: 'buyer',
      intelligenceSnippet: 'First-home buyer. Pre-approval valid for 60 days. High urgency.',
      lastActivityDetail: 'Downloaded info pack for 88 Queen Street, CBD',
      lastActivityAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Emma Davis',
      emails: ['emma.davis@me.com'],
      phones: ['+64219876543'],
      role: 'vendor',
      intelligenceSnippet: 'Inherited property. Unsure about market timing.',
      lastActivityDetail: 'Requested appraisal for 45 Mount Eden Road',
      lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'William Jackson',
      emails: ['william.jackson@provider.nz'],
      phones: ['+64218765432'],
      role: 'buyer',
      intelligenceSnippet: 'High probability seller (6-9 months). Watching local auction clearance rates.',
      lastActivityDetail: 'Viewed 12 Jervois Road, Herne Bay (2h ago)',
      lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Olivia Wilson',
      emails: ['olivia.wilson@gmail.com'],
      phones: ['+64215551234'],
      role: 'vendor',
      intelligenceSnippet: 'Active buyer. Attending 3+ open homes per weekend in Grey Lynn area.',
      lastActivityDetail: 'Scheduled private viewing for tomorrow',
      lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'James Thompson',
      emails: ['james.thompson@tradies.co.nz'],
      phones: ['+64216667788'],
      role: 'tradesperson',
      intelligenceSnippet: 'Reliable plumber. Quick turnaround on pre-settlement repairs.',
      lastActivityDetail: 'Completed repair job at 56 Richmond Road',
      lastActivityAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Sophia Taylor',
      emails: ['sophia.taylor@windowslive.com'],
      phones: ['+64213334455'],
      role: 'vendor',
      intelligenceSnippet: 'Trades lead. Reliable for urgent pre-settlement repairs.',
      lastActivityDetail: 'Viewed 88 Queen Street, CBD (2h ago)',
      lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Liam Thompson',
      emails: ['liam.thompson@xtra.co.nz'],
      phones: ['+64217778899'],
      role: 'buyer',
      intelligenceSnippet: 'Previous client. Portfolio investor looking for multi-unit properties.',
      lastActivityDetail: 'Inquired about 102 Tamaki Drive, Mission Bay',
      lastActivityAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Charlotte Brown',
      emails: ['charlotte.brown@realestate.co.nz'],
      phones: ['+64212223344'],
      role: 'agent',
      intelligenceSnippet: 'Fellow agent. Good for referrals in North Shore area.',
      lastActivityDetail: 'Cross-referred client for Devonport listing',
      lastActivityAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Noah Garcia',
      emails: ['noah.garcia@outlook.co.nz'],
      phones: ['+64219990011'],
      role: 'market',
      intelligenceSnippet: 'Bank mortgage advisor. Great for pre-approval referrals.',
      lastActivityDetail: 'Approved finance for client purchase',
      lastActivityAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  });

  console.log(`Created 10 sample contacts including: ${buyerContact.name}, ${vendorContact.name}`);

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
  // 5 Comprehensive Email Thread Examples with Full Messages

  // =====================================================
  // THREAD 1: BUYER INQUIRY - First Home Buyer
  // =====================================================
  const buyerInquiryThread = await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-buyer-inquiry-001',
      subject: 'Inquiry about 45 Harbour View Drive - First Home Buyer',
      participants: [
        { name: 'Michael Chen', email: 'michael.chen@gmail.com' },
        { name: 'Demo Agent', email: 'demo@zena.ai' }
      ],
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      summary: 'First home buyer interested in 45 Harbour View Drive. Asking about price range, property features, and availability for inspection. High buying intent.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'low',
      nextActionOwner: 'agent',
      nextAction: 'Respond with price guide and schedule inspection',
      draftResponse: 'Hi Michael,\n\nThank you for your interest in 45 Harbour View Drive! This is a fantastic property for first home buyers.\n\nThe price guide is $850,000 - $920,000. The property features 3 bedrooms, 2 bathrooms, and a north-facing backyard.\n\nI have availability for private inspections this Saturday at 10am or 2pm. Would either time suit you?\n\nBest regards,\nDemo Agent',
      propertyId: property.id
    }
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: buyerInquiryThread.id,
        externalId: 'msg-buyer-inquiry-001-1',
        from: JSON.stringify({ name: 'Michael Chen', email: 'michael.chen@gmail.com' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: 'Inquiry about 45 Harbour View Drive - First Home Buyer',
        body: `Hi there,

I came across your listing for 45 Harbour View Drive on realestate.com.au and I'm very interested in learning more about the property.

My wife and I are first home buyers looking to purchase in the area. We've been pre-approved for a loan up to $950,000 and this property looks like it could be perfect for us.

Could you please let me know:
1. What is the price guide for this property?
2. How many bedrooms and bathrooms does it have?
3. Is the backyard north or south facing?
4. Are there any offers on the table already?
5. When can we arrange a private inspection?

We're quite motivated to buy before the end of the year as we're expecting our first child in March.

Thank you for your time. Looking forward to hearing from you.

Best regards,
Michael Chen
0412 345 678`,
        bodyHtml: `<p>Hi there,</p>
<p>I came across your listing for 45 Harbour View Drive on realestate.com.au and I'm very interested in learning more about the property.</p>
<p>My wife and I are first home buyers looking to purchase in the area. We've been pre-approved for a loan up to $950,000 and this property looks like it could be perfect for us.</p>
<p>Could you please let me know:</p>
<ol>
<li>What is the price guide for this property?</li>
<li>How many bedrooms and bathrooms does it have?</li>
<li>Is the backyard north or south facing?</li>
<li>Are there any offers on the table already?</li>
<li>When can we arrange a private inspection?</li>
</ol>
<p>We're quite motivated to buy before the end of the year as we're expecting our first child in March.</p>
<p>Thank you for your time. Looking forward to hearing from you.</p>
<p>Best regards,<br>Michael Chen<br>0412 345 678</p>`,
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isFromUser: false
      }
    ]
  });

  console.log('Created Thread 1: Buyer Inquiry with message');

  // =====================================================
  // THREAD 2: VENDOR WANTING TO SELL
  // =====================================================
  const vendorSellingThread = await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-vendor-selling-002',
      subject: 'Looking to sell my property at 78 Parkside Avenue',
      participants: [
        { name: 'Sandra Williams', email: 'sandra.williams@outlook.com' },
        { name: 'Demo Agent', email: 'demo@zena.ai' }
      ],
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      summary: 'Vendor wants to sell 78 Parkside Avenue due to downsizing. Property has 4 bedrooms, recently renovated. Looking for agent recommendation and market appraisal.',
      classification: 'vendor',
      category: 'focus',
      riskLevel: 'medium',
      riskReason: 'Time-sensitive - vendor has conditional purchase on new property',
      nextActionOwner: 'agent',
      nextAction: 'Schedule appraisal appointment and prepare CMA',
      draftResponse: 'Hi Sandra,\n\nThank you for reaching out! I would be delighted to help you with the sale of 78 Parkside Avenue.\n\nBased on recent sales in your area, properties like yours are achieving between $1.2M - $1.4M. However, I would love to see the property in person to give you a more accurate assessment.\n\nWould you be available this Thursday afternoon for an appraisal? I\'ll bring some comparable sales data to show you.\n\nBest regards,\nDemo Agent'
    }
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: vendorSellingThread.id,
        externalId: 'msg-vendor-selling-002-1',
        from: JSON.stringify({ name: 'Sandra Williams', email: 'sandra.williams@outlook.com' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: 'Looking to sell my property at 78 Parkside Avenue',
        body: `Dear Agent,

My husband and I are looking to sell our family home at 78 Parkside Avenue. We've lived here for 22 years and raised our three children here, but now that they've all moved out, we're looking to downsize to something more manageable.

The property is a 4 bedroom, 2 bathroom house on a 650sqm block. We've done extensive renovations over the past 5 years including:
- Complete kitchen renovation with stone benchtops and European appliances
- New main bathroom with underfloor heating
- Polished timber floors throughout
- New ducted air conditioning
- Solar panels (6.6kW system)
- Built-in wardrobes in all bedrooms

We've actually already put an offer on a unit at Rosewood Gardens which has been accepted conditionally on the sale of our property. We have 90 days to sell, which I understand might be tight but we're flexible on price if needed.

Could you please let me know:
1. What you think our property might be worth in the current market?
2. What your commission structure is?
3. How long you think it would take to sell?
4. What marketing campaign you would recommend?

We've spoken to two other agents but wanted to get your opinion as well before making a decision.

Looking forward to your response.

Kind regards,
Sandra Williams
78 Parkside Avenue
0423 987 654`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isFromUser: false
      }
    ]
  });

  console.log('Created Thread 2: Vendor Selling with message');

  // =====================================================
  // THREAD 3: VIEWING REQUEST - MULTIPLE PARTICIPANTS
  // =====================================================
  const viewingRequestThread = await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-viewing-request-003',
      subject: 'Re: Booking Viewing - 23 Ocean Parade Unit 5',
      participants: [
        { name: 'James & Emily Rodriguez', email: 'rodriguez.family@gmail.com' },
        { name: 'Demo Agent', email: 'demo@zena.ai' }
      ],
      lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      summary: 'Couple requesting viewing for beachside apartment. They are relocating from Melbourne, have sold their property, and are looking for immediate settlement. Very motivated buyers.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'low',
      nextActionOwner: 'agent',
      nextAction: 'Confirm viewing for Saturday 11am and send property info pack',
      draftResponse: 'Hi James and Emily,\n\nGreat news - the vendor has confirmed Saturday at 11am works perfectly for a private viewing.\n\nI\'ll meet you at the property. Just buzz Unit 5 on the intercom when you arrive.\n\nIn the meantime, I\'ve attached the contract, strata report, and building inspection from the vendor. Let me know if you have any questions.\n\nSee you Saturday!\n\nDemo Agent'
    }
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: viewingRequestThread.id,
        externalId: 'msg-viewing-003-1',
        from: JSON.stringify({ name: 'James Rodriguez', email: 'rodriguez.family@gmail.com' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: 'Booking Viewing - 23 Ocean Parade Unit 5',
        body: `Hi,

We saw your listing for Unit 5/23 Ocean Parade and we're very keen to book a viewing.

We're relocating from Melbourne for my wife's job and are looking for a 2-3 bedroom apartment close to the beach and public transport. This unit looks absolutely perfect!

We've already sold our Melbourne property (settled last month) so we're cashed up and ready to move quickly. Ideally we'd like to be in our new place before Emily starts her new job on February 15th.

Are there any times available for a private inspection this weekend? We're flying up on Friday evening and are free all day Saturday and Sunday morning.

Also, could you please send through:
- The contract of sale
- Any strata reports
- Body corporate fees and any special levies
- Building reports if available

Thanks so much!

James & Emily Rodriguez
0411 222 333`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        isFromUser: false
      },
      {
        threadId: viewingRequestThread.id,
        externalId: 'msg-viewing-003-2',
        from: JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' }),
        to: [JSON.stringify({ name: 'James Rodriguez', email: 'rodriguez.family@gmail.com' })],
        cc: [],
        subject: 'Re: Booking Viewing - 23 Ocean Parade Unit 5',
        body: `Hi James and Emily,

Thanks for reaching out! Great to hear you're relocating to our beautiful area.

Unit 5 at 23 Ocean Parade is a fantastic property - it's only 200m to the beach and right near the train station.

I have availability for private viewings on:
- Saturday 11am
- Saturday 3pm  
- Sunday 9am

Let me know which time works best and I'll confirm with the vendor.

In the meantime, I'm requesting the documents from our admin team and will forward them as soon as they're ready.

Looking forward to meeting you both!

Best regards,
Demo Agent
Licensed Real Estate Agent
0400 123 456`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isFromUser: true
      },
      {
        threadId: viewingRequestThread.id,
        externalId: 'msg-viewing-003-3',
        from: JSON.stringify({ name: 'Emily Rodriguez', email: 'rodriguez.family@gmail.com' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: 'Re: Booking Viewing - 23 Ocean Parade Unit 5',
        body: `Hi Demo,

Saturday at 11am would be perfect!

Just a couple more questions I thought of:
- Is the building pet-friendly? We have a small dog (Cavoodle)
- Which way does the balcony face?
- Is there parking included?

Thanks again - we're so excited to see the property!

Emily`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isFromUser: false
      }
    ]
  });

  console.log('Created Thread 3: Viewing Request with 3 messages');

  // =====================================================
  // THREAD 4: OFFER NEGOTIATION - HIGH STAKES
  // =====================================================
  const offerNegotiationThread = await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-offer-negotiation-004',
      subject: 'RE: Offer on 156 Grandview Terrace - Counter Offer',
      participants: [
        { name: 'David Thompson', email: 'david.thompson@lawfirm.com.au' },
        { name: 'Demo Agent', email: 'demo@zena.ai' },
        { name: 'Rebecca Chen', email: 'rebecca.chen@solicitors.com.au' }
      ],
      lastMessageAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      summary: 'Active offer negotiation. Buyer initially offered $1.85M, vendor countered at $1.95M. Buyer has come back at $1.9M. Vendor considering but wants 60-day settlement.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'high',
      riskReason: 'Time-sensitive negotiation - buyer has competing offer deadline',
      nextActionOwner: 'agent',
      nextAction: 'Present counter-offer to vendor immediately and get decision',
      draftResponse: 'Hi David,\n\nI\'ve just spoken with the vendor regarding your client\'s revised offer of $1.9M.\n\nThey are prepared to accept $1.9M subject to the following conditions:\n1. 60-day settlement (non-negotiable - they need time to find alternative accommodation)\n2. 5% deposit paid within 3 business days\n3. Finance clause of 14 days maximum\n\nPlease advise if your client is agreeable to these terms. The vendor has indicated they have received interest from another party, so a prompt response would be appreciated.\n\nBest regards,\nDemo Agent'
    }
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: offerNegotiationThread.id,
        externalId: 'msg-offer-004-1',
        from: JSON.stringify({ name: 'David Thompson', email: 'david.thompson@lawfirm.com.au' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [JSON.stringify({ name: 'Rebecca Chen', email: 'rebecca.chen@solicitors.com.au' })],
        subject: 'Offer on 156 Grandview Terrace',
        body: `Dear Demo Agent,

We act on behalf of Mr. Robert & Mrs. Patricia Nguyen in relation to the purchase of 156 Grandview Terrace.

Our clients inspected the property twice and are now in a position to make an offer. Please find our clients' offer attached, which can be summarized as follows:

PURCHASE PRICE: $1,850,000.00 (One Million Eight Hundred and Fifty Thousand Dollars)

Terms:
- 10% Deposit
- 30-day settlement
- Subject to finance (21 days)
- Subject to satisfactory building & pest inspection (14 days)

Our clients are pre-approved with Commonwealth Bank and are serious purchasers. They are currently renting and are flexible on settlement if required.

Please present this offer to your vendor and advise us of their response at your earliest convenience.

Regards,

David Thompson
Partner
Thompson & Associates Lawyers
Level 12, 100 Martin Place
Sydney NSW 2000
Ph: (02) 9123 4567
david.thompson@lawfirm.com.au`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isFromUser: false
      },
      {
        threadId: offerNegotiationThread.id,
        externalId: 'msg-offer-004-2',
        from: JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' }),
        to: [JSON.stringify({ name: 'David Thompson', email: 'david.thompson@lawfirm.com.au' })],
        cc: [JSON.stringify({ name: 'Rebecca Chen', email: 'rebecca.chen@solicitors.com.au' })],
        subject: 'RE: Offer on 156 Grandview Terrace - Vendor Counter',
        body: `Dear David,

Thank you for presenting your clients' offer on 156 Grandview Terrace.

I have discussed the offer with my vendor and while they appreciate the interest, they are unable to accept the current price. The vendor has advised they would be prepared to accept an offer of $1,950,000 on the following terms:

- 10% Deposit (held by vendor's solicitor)
- 60-day settlement
- Finance to be unconditional within 14 days
- Building & pest inspection within 7 days

The vendor has recently had the property valued at $2.05M and believes this counter-offer represents a fair compromise.

Please discuss with your clients and advise if they wish to proceed further.

Best regards,
Demo Agent
Licensed Real Estate Agent`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isFromUser: true
      },
      {
        threadId: offerNegotiationThread.id,
        externalId: 'msg-offer-004-3',
        from: JSON.stringify({ name: 'David Thompson', email: 'david.thompson@lawfirm.com.au' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [JSON.stringify({ name: 'Rebecca Chen', email: 'rebecca.chen@solicitors.com.au' })],
        subject: 'RE: Offer on 156 Grandview Terrace - Counter Offer',
        body: `Dear Demo,

We have received instructions from our clients.

Our clients understand the vendor's position and are prepared to increase their offer. However, $1.95M is above their maximum budget.

Our clients' REVISED OFFER is as follows:

PURCHASE PRICE: $1,900,000.00 (One Million Nine Hundred Thousand Dollars)

This is our clients' BEST AND FINAL OFFER. They have been advised by their bank that this is the maximum they can borrow.

Terms remain as previously stated, however our clients are flexible on settlement (up to 45 days acceptable).

Please note our clients are viewing another property this weekend and may make an offer there if this negotiation does not progress. We would appreciate your vendor's response by 5pm tomorrow.

Regards,

David Thompson
Partner`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 30 * 60 * 1000),
        receivedAt: new Date(Date.now() - 30 * 60 * 1000),
        isFromUser: false
      }
    ]
  });

  console.log('Created Thread 4: Offer Negotiation with 3 messages');

  // =====================================================
  // THREAD 5: URGENT SETTLEMENT ISSUE - HIGH RISK
  // =====================================================
  const settlementIssueThread = await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-settlement-urgent-005',
      subject: 'URGENT: Settlement Delay - 42 Riverside Drive',
      participants: [
        { name: 'Amanda Foster', email: 'amanda.foster@banklaw.com.au' },
        { name: 'Demo Agent', email: 'demo@zena.ai' },
        { name: 'Tony Marchetti', email: 'tony@vendorsolicitor.com.au' }
      ],
      lastMessageAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      summary: 'CRITICAL: Settlement scheduled for tomorrow may be delayed. Bank has flagged an issue with the valuation. Buyer is panicked. Vendor is threatening default notice. Need immediate resolution.',
      classification: 'lawyer_broker',
      category: 'focus',
      riskLevel: 'high',
      riskReason: 'Settlement at risk - potential legal action, deposit at risk, vendor may rescind',
      nextActionOwner: 'agent',
      nextAction: 'Contact bank immediately to resolve valuation discrepancy and update all parties',
      draftResponse: 'Hi Amanda,\n\nI understand this is extremely stressful for your client. I\'ve just spoken with the bank\'s valuation team and they\'ve agreed to have a senior valuer review the report today.\n\nThe issue appears to be that the valuer confused the property with a neighbouring unit that sold for $50k less. I\'m providing them with 3 recent comparable sales to demonstrate the correct value.\n\nI\'ll have an update within the next 2 hours. In the meantime, I\'ve asked Tony to hold off on any default notices until we\'ve resolved this.\n\nI\'ll call you as soon as I have news.\n\nDemo Agent'
    }
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: settlementIssueThread.id,
        externalId: 'msg-settlement-005-1',
        from: JSON.stringify({ name: 'Amanda Foster', email: 'amanda.foster@banklaw.com.au' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [JSON.stringify({ name: 'Tony Marchetti', email: 'tony@vendorsolicitor.com.au' })],
        subject: 'URGENT: Settlement Delay - 42 Riverside Drive',
        body: `URGENT - PLEASE RESPOND IMMEDIATELY

Dear Demo,

Settlement for 42 Riverside Drive is scheduled for TOMORROW (Friday) at 2pm.

We have just received advice from Westpac that they are unable to settle as the bank valuation has come in $80,000 below the purchase price. The bank is now requiring our clients to either:
1. Make up the $80,000 shortfall from their own funds (which they do not have), OR
2. Request a revaluation, which will take 5-7 business days

Our clients are distraught. They have:
- Already given notice on their rental property
- Booked removalists for Saturday
- Taken time off work
- Their children are starting at the new school on Monday

We need to explore ALL options urgently:
1. Can the vendor agree to a price reduction?
2. Can settlement be extended by 7 days to allow for revaluation?
3. Is there any way to expedite a revaluation?

The deposit of $92,500 is at risk if we cannot settle. The vendor's solicitor has already indicated they will issue a Notice of Default if settlement is delayed.

Please call me URGENTLY on 0400 555 666.

This needs to be resolved TODAY.

Amanda Foster
Senior Associate
Banking & Finance
Foster & Associates`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 45 * 60 * 1000),
        receivedAt: new Date(Date.now() - 45 * 60 * 1000),
        isFromUser: false
      },
      {
        threadId: settlementIssueThread.id,
        externalId: 'msg-settlement-005-2',
        from: JSON.stringify({ name: 'Tony Marchetti', email: 'tony@vendorsolicitor.com.au' }),
        to: [
          JSON.stringify({ name: 'Amanda Foster', email: 'amanda.foster@banklaw.com.au' }),
          JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })
        ],
        cc: [],
        subject: 'RE: URGENT: Settlement Delay - 42 Riverside Drive',
        body: `Amanda / Demo,

I have just received instructions from my client (the vendor).

My client has already committed to purchasing another property which settles 3 days after the sale of 42 Riverside Drive. If this settlement does not proceed tomorrow, they will be in breach of their own purchase contract.

My client has instructed me to advise that:

1. They are NOT prepared to reduce the price. The property was sold in a competitive tender process at market value.

2. They will only agree to extend settlement by a maximum of 3 BUSINESS DAYS and only if the purchaser pays penalty interest at 10% p.a. for every day of delay.

3. If settlement has not occurred by close of business next Wednesday, they will rescind the contract and claim the deposit and may seek additional damages.

I trust this makes the vendor's position clear. This is not a negotiation.

Tony Marchetti
Marchetti Legal
Vendor's Solicitor`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 25 * 60 * 1000),
        receivedAt: new Date(Date.now() - 25 * 60 * 1000),
        isFromUser: false
      },
      {
        threadId: settlementIssueThread.id,
        externalId: 'msg-settlement-005-3',
        from: JSON.stringify({ name: 'Amanda Foster', email: 'amanda.foster@banklaw.com.au' }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: 'RE: URGENT: Settlement Delay - 42 Riverside Drive',
        body: `Demo,

Please help. My clients are in tears.

Is there ANYTHING you can do? Can you speak to the bank? Can you get the valuer to reconsider?

The comparable sale the valuer used was a completely different property configuration. This valuation is clearly wrong.

Please call me.

Amanda`,
        bodyHtml: null,
        sentAt: new Date(Date.now() - 15 * 60 * 1000),
        receivedAt: new Date(Date.now() - 15 * 60 * 1000),
        isFromUser: false
      }
    ]
  });

  console.log('Created Thread 5: Urgent Settlement Issue with 3 messages');

  // =====================================================
  // THREAD 6: SCHOOL ZONE INQUIRY - NEW
  // =====================================================
  await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-school-zone-006',
      subject: 'School zones for 12 Karaka Street, Ponsonby',
      participants: [{ name: 'Liam Wilson', email: 'liam.wilson@me.com' }],
      lastMessageAt: new Date(Date.now() - 3 * 3600000),
      summary: 'Buyer asking if property is within Auckland Grammar zone. High priority due to school enrollment deadlines.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'low',
      nextActionOwner: 'agent',
      nextAction: 'Confirm school zones and reply',
      propertyId: property.id
    }
  });

  // =====================================================
  // THREAD 7: MARKETING UPDATE REQUEST - NEW
  // =====================================================
  await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-marketing-update-007',
      subject: 'Marketing Report - 8 Beach Road',
      participants: [{ name: 'Graham Norton', email: 'gnorton@xtra.co.nz' }],
      lastMessageAt: new Date(Date.now() - 5 * 3600000),
      summary: 'Vendor requesting update on TradeMe views and social media engagement for their property.',
      classification: 'vendor',
      category: 'focus',
      riskLevel: 'low',
      nextActionOwner: 'agent',
      nextAction: 'Send weekly marketing report',
    }
  });

  // =====================================================
  // THREAD 8: OPEN HOME FOLLOW UP - NEW
  // =====================================================
  await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-open-home-008',
      subject: 'Follow up from 102 Great North Road Open Home',
      participants: [{ name: 'Sophie Taylor', email: 'sophie.taylor@gmail.com' }],
      lastMessageAt: new Date(Date.now() - 8 * 3600000),
      summary: 'Buyer loved the kitchen, asking for info on recent sales in Grey Lynn.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'low',
      nextActionOwner: 'agent',
      nextAction: 'Send CMA and Grey Lynn market update',
    }
  });

  // =====================================================
  // THREAD 9: PRE-AUCTION OFFER - NEW
  // =====================================================
  await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-pre-auction-009',
      subject: 'Pre-auction offer for 15 Mission Bay Drive',
      participants: [{ name: 'Kevin Zhang', email: 'kevin.z@investments.co' }],
      lastMessageAt: new Date(Date.now() - 1 * 3600000),
      summary: 'URGENT: Pre-auction offer received. Buyer wants to stop the auction.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'high',
      riskReason: 'Time-sensitive pre-auction offer',
      nextActionOwner: 'agent',
      nextAction: 'Contact vendor and prepare auction variation forms',
    }
  });

  // =====================================================
  // THREAD 10: REPAIR BEFORE SETTLEMENT - NEW
  // =====================================================
  await prisma.thread.create({
    data: {
      userId: user.id,
      emailAccountId: emailAccount.id,
      externalId: 'mock-repair-010',
      subject: 'Pre-settlement inspection - Leaky faucet at 55 High St',
      participants: [{ name: 'Sarah Connor', email: 's.connor@buyer.net' }],
      lastMessageAt: new Date(Date.now() - 4 * 3600000),
      summary: 'Buyer identified a leak during pre-settlement inspection. Needs fixing before settlement on Friday.',
      classification: 'buyer',
      category: 'focus',
      riskLevel: 'medium',
      nextActionOwner: 'agent',
      nextAction: 'Arrange plumber and confirm with vendor',
    }
  });

  // =====================================================
  // AWAITING RESPONSES (10 THREADS)
  // =====================================================

  const awaitingThreads = [
    { subject: 'Waiting for Bank Valuation - 123 Main St', participant: 'valuer@bank.co.nz', summary: 'Waiting for official valuation report to complete finance condition.' },
    { subject: 'Contract Signature Required - 45 Harbour View', participant: 'vendor@outlook.com', summary: 'Sent corrected contract to vendor for initialing changes.' },
    { subject: 'Tenant Inspection Confirmation', participant: 'tenant@gmail.com', summary: 'Asked tenant for permission to show property next Tuesday.' },
    { subject: 'Deposit Receipt Confirmation', participant: 'trust@lawyers.co.nz', summary: 'Waiting for confirmation that 10% deposit has hit trust account.' },
    { subject: 'Listing Photos - 7a Garden Lane', participant: 'photos@realestatepix.com', summary: 'Waiting for edited photos and drone footage.' },
    { subject: 'Council Building Consent Status', participant: 'consent@aucklandcouncil.govt.nz', summary: 'Followed up on the CCC for the new deck.' },
    { subject: 'Signed Offer - 102 Great North Rd', participant: 'buyer.lead@xtra.co.nz', summary: 'Buyer promised to return signed offer by COB today.' },
    { subject: 'Pet Approval - Body Corp Unit 5', participant: 'bc.manager@strata.co.nz', summary: 'Waiting for body corp committee to approve the resident\'s dog.' },
    { subject: 'Appraisal Date Confirmation', participant: 'potential.vendor@me.com', summary: 'Suggested two times for appraisal, waiting for choice.' },
    { subject: 'Maintenance Quote - Leak repair', participant: 'plumbing@craftsman.co', summary: 'Requested quote for leak identified in pre-settlement.' }
  ];

  for (let i = 0; i < awaitingThreads.length; i++) {
    await prisma.thread.create({
      data: {
        userId: user.id,
        emailAccountId: emailAccount.id,
        externalId: `mock-awaiting-${i + 1}`,
        subject: awaitingThreads[i].subject,
        participants: [{ name: awaitingThreads[i].participant.split('@')[0], email: awaitingThreads[i].participant }],
        lastMessageAt: new Date(Date.now() - (i + 2) * 24 * 3600000),
        lastReplyAt: new Date(Date.now() - (i + 2) * 24 * 3600000),
        summary: awaitingThreads[i].summary,
        classification: 'lawyer_broker',
        category: 'waiting',
        riskLevel: 'low',
        nextActionOwner: 'other'
      }
    });
  }

  console.log('Generating per-contact mock email threads...');
  const allContacts = await prisma.contact.findMany();

  for (const contact of allContacts) {
    const isBuyer = contact.role === 'buyer';

    // Thread 1: Initial Relationship Setup
    const thread1 = await prisma.thread.create({
      data: {
        userId: user.id,
        emailAccountId: emailAccount.id,
        externalId: `mock-thread-1-${contact.id}`,
        subject: isBuyer ? 'Looking for properties in Ponsonby' : 'Considering selling my property',
        participants: [
          { name: contact.name, email: contact.emails[0] },
          { name: 'Demo Agent', email: 'demo@zena.ai' }
        ],
        lastMessageAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        summary: isBuyer
          ? `Initial inquiry from ${contact.name} regarding Ponsonby listings.`
          : `Market appraisal discussion with ${contact.name}.`,
        classification: isBuyer ? 'buyer' : 'vendor',
        category: 'waiting',
        riskLevel: 'low',
        nextActionOwner: 'agent',
        nextAction: 'Weekly follow up nudge'
      }
    });

    await prisma.message.create({
      data: {
        threadId: thread1.id,
        externalId: `msg-1-${contact.id}`,
        from: JSON.stringify({ name: contact.name, email: contact.emails[0] }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: thread1.subject,
        body: `Hi Demo Agent, I'm reaching out to discuss ${isBuyer ? 'buying a home' : 'selling my place'}. Let me know when you're free to chat.`,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isFromUser: false
      }
    });

    // Thread 2: Recent Activity / High Intent
    const thread2 = await prisma.thread.create({
      data: {
        userId: user.id,
        emailAccountId: emailAccount.id,
        externalId: `mock-thread-2-${contact.id}`,
        subject: isBuyer ? 'Feedback on recent viewing' : 'Ready to list - Next steps?',
        participants: [
          { name: contact.name, email: contact.emails[0] },
          { name: 'Demo Agent', email: 'demo@zena.ai' }
        ],
        lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        summary: isBuyer
          ? `${contact.name} provided feedback on the kitchen and layout. Very interested.`
          : `${contact.name} wants to go live next week. High urgency.`,
        classification: isBuyer ? 'buyer' : 'vendor',
        category: 'focus',
        riskLevel: isBuyer ? 'low' : 'medium',
        nextActionOwner: 'agent',
        nextAction: isBuyer ? 'Send info pack' : 'Prepare listing agreement'
      }
    });

    await prisma.message.create({
      data: {
        threadId: thread2.id,
        externalId: `msg-2-${contact.id}`,
        from: JSON.stringify({ name: contact.name, email: contact.emails[0] }),
        to: [JSON.stringify({ name: 'Demo Agent', email: 'demo@zena.ai' })],
        cc: [],
        subject: thread2.subject,
        body: isBuyer
          ? "I really liked the property we saw today. Can you send through the council records?"
          : "Let's do it. We want to be on the market by Monday. What do you need from us?",
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isFromUser: false
      }
    });
  }

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
