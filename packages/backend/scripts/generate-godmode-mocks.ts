import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Generating Mock Godmode Data...');

    const user = await prisma.user.findFirst({
        where: { email: 'demo@zena.ai' }
    });

    if (!user) {
        console.error('Demo user not found. Please run seed first.');
        process.exit(1);
    }

    const userId = user.id;

    // Find a contact and property to link to
    const contact = await prisma.contact.findFirst({ where: { userId } });
    const property = await prisma.property.findFirst({ where: { userId } });

    // 1. CLEAR EXISTING ACTIONS (Optional, but cleaner for demo)
    await prisma.autonomousAction.deleteMany({
        where: { userId }
    });

    // 2. CREATE PENDING SUGGESTIONS (Demi-God Mode) - DYNAMIC & PRE-GENERATED

    // A. Real Vendor Report Action
    // Find a property with a vendor to make it real
    const activeProperty = await prisma.property.findFirst({
        where: { userId, status: 'active', vendors: { some: {} } },
        include: { vendors: true }
    });

    const vendorReportAction = activeProperty ? {
        userId,
        propertyId: activeProperty.id,
        actionType: 'generate_weekly_report',
        priority: 9,
        title: `Overdue Vendor Report: ${activeProperty.address}`,
        description: `Weekly campaign report for ${activeProperty.address} is 2 days overdue.`,
        reasoning: `Proactive communication is critical. ${activeProperty.viewingCount} total views (+5 this week).`,
        intelligenceSources: [
            { type: 'property', id: activeProperty.id, summary: `${activeProperty.inquiryCount} active inquiries` },
            { type: 'milestone', id: 'listing-001', summary: '7 days since last report' }
        ],
        // PRE-GENERATED "ZERO CLICK" DRAFT
        draftSubject: `Weekly Campaign Activity - ${activeProperty.address}`,
        draftBody: `Hi ${activeProperty.vendors[0].name.split(' ')[0]},\n\nPlease find attached your weekly campaign report for ${activeProperty.address}.\n\nExecutive Summary:\nWe've had a strong week with 5 new inspections. Feedback indicates price is sitting correctly in the market, though some buyers are comparing us to the new listing on the corner.\n\nTraffic & Engagement:\n- Views: ${activeProperty.viewingCount} (Trend: UP)\n- Inquiries: ${activeProperty.inquiryCount} total\n\nStrategic Recommendation:\nContinue with current pricing strategy for one more week. I'll call you tomorrow to discuss the open home times.\n\nBest regards,\nDemo Agent`,
        payload: {
            pdfUrl: 'mock-report-123.pdf',
            views: { total: activeProperty.viewingCount, thisWeek: 5, trend: 'up' },
            inquiries: { total: activeProperty.inquiryCount, thisWeek: 2 }
        },
        status: 'pending',
        mode: 'demi_god',
    } : null;

    // B. Real Buyer Match Action
    // Find a buyer
    const activeBuyer = await prisma.contact.findFirst({
        where: { userId, role: 'buyer' }
    });

    const buyerMatchAction = activeBuyer && activeProperty ? {
        userId,
        contactId: activeBuyer.id,
        actionType: 'buyer_match_intro',
        priority: 10,
        title: `Hot Buyer Match: ${activeBuyer.name} (95%)`,
        description: `${activeBuyer.name} matches ${activeProperty.address} perfectly based on recent search behavior.`,
        reasoning: `High intent buyer. Just viewed 3 similar properties. Verify interest immediately.`,
        intelligenceSources: [
            { type: 'prediction', id: 'match-001', summary: 'Match Score: 95%' }
        ],
        // PRE-GENERATED SMS & EMAIL
        draftSubject: `First look: Perfect match for you`,
        draftBody: `Hi ${activeBuyer.name.split(' ')[0]},\n\nI found it.\n\nI'm holding the keys to ${activeProperty.address} - it matches your criteria for a 3-bedder perfectly.\n\nI'm launching it online in 48 hours, but wanted to get you through first.\n\nCan you meet me there Thursday at 5pm?\n\nBest,\nDemo Agent`,
        script: `(Phone Rings)\n\n"Hey ${activeBuyer.name.split(' ')[0]}, Hamish here.\n\nLook, I'm standing in a living room on ${activeProperty.address.split(',')[0]} and I honestly thought of you immediately.\n\nIt's got the specific layout you wanted. I'm literally holding the keys before the photographer comes tomorrow.\n\nCan you get here in 20 mins?"`,
        payload: {
            smsDraft: `Hey ${activeBuyer.name.split(' ')[0]}, just listed ${activeProperty.address}. Perfect match for what you wanted. 3 bed, 2 bath. Can you view today at 5pm before it hits TradeMe? - Hamish`
        },
        status: 'pending',
        mode: 'demi_god'
    } : null;

    // C. Data-Driven "Price Reduction" Action (Rich Action)
    // Find a property created > 45 days ago (or simulate it)
    const staleProperty = activeProperty; // Re-use active property for demo purposes

    const priceReductionAction = staleProperty ? {
        userId,
        propertyId: staleProperty.id,
        actionType: 'price_reduction',
        priority: 10,
        title: `Price Adjustment Required: ${staleProperty.address}`,
        description: `Property has been on market for 45 days with declining engagement.`,
        reasoning: `Views have dropped 40% in the last 14 days. 2 weeks without a new offer signals price misalignment.`,
        intelligenceSources: [
            { type: 'market', id: 'mkt-001', summary: '45 Days on Market' },
            { type: 'trend', id: 'trd-001', summary: 'Views down 40%' }
        ],
        draftSubject: `Price Alignment - ${staleProperty.address}`,
        draftBody: `Hi ${staleProperty.vendors[0]?.name.split(' ')[0] || 'Vendor'},\n\nI've been reviewing the campaign for ${staleProperty.address}. We are now at 45 days on market, and the data is showing a shift.\n\nTraffic Analysis:\n- Online views have dropped by 40% in the last 14 days.\n- We are seeing repeat engagement from 2 buyers, but no offers.\n\nThe market is telling us that while the property is liked, the price approach is creating friction. To reignite momentum and capture those 2 interested parties, I recommend a price adjustment to align with the current comparable sales (attached).\n\nThis will trigger a "New Price" alert to our entire database of 5,000+ buyers.\n\nAre you open to discussing this briefly today?\n\nBest,\nDemo Agent`,
        payload: {
            pdfUrl: 'comparable-sales-analysis.pdf',
            metrics: { daysOnMarket: 45, viewTrend: -40 }
        },
        status: 'pending',
        mode: 'demi_god'
    } : null;

    const actionsToCreate = [
        vendorReportAction,
        buyerMatchAction,
        priceReductionAction,
        {
            userId,
            contactId: contact?.id,
            actionType: 'send_email',
            priority: 8,
            title: 'High Burn Risk: Re-engage Sarah Johnson',
            description: 'Sarah has been inactive for 14 days and her churn risk has spiked to 0.85.',
            reasoning: 'Engagement patterns indicate a potential loss of interest. A personalised follow-up on the "Renovator Delight" listing could pivot her back into the active buyer pool.',
            intelligenceSources: [
                { type: 'prediction', id: 'churn-001', summary: 'Churn Risk: 0.85 (High)' },
                { type: 'email', id: 'last-msg-001', summary: 'Last contact: 14 days ago' }
            ],
            draftSubject: 'Checking in on your search, Sarah',
            draftBody: 'Hi Sarah, I noticed you haven\'t had a chance to look at the new listings in Redfern this week. I have an off-market opportunity that might fit your criteria perfectly. Let me know if you are free for a quick chat today?',
            status: 'pending',
            mode: 'demi_god',
        }
    ].filter(Boolean); // Remove nulls

    await prisma.autonomousAction.createMany({
        data: actionsToCreate as any // Type assertion for optional fields
    });

    // 3. CREATE COMPLETED ACTIONS (Full-God Mode History - Diverse Dates)
    const now = new Date();
    const oneHour = 3600000;
    const oneDay = 86400000;

    await prisma.autonomousAction.createMany({
        data: [
            {
                userId,
                contactId: contact?.id,
                actionType: 'schedule_followup',
                priority: 7,
                title: 'Follow-up with John Smith (Autonomous)',
                description: 'Autonomous follow-up task created based on high sell intent prediction.',
                reasoning: 'John viewed the appraisal doc twice in 24 hours. Full-God mode identified high urgency and scheduled a follow-up call.',
                intelligenceSources: [{ type: 'prediction', id: 'sell-intent-001', summary: 'Sell Intent: 0.92' }],
                status: 'completed',
                mode: 'full_god',
                executedAt: new Date(now.getTime() - oneHour), // Today
            },
            {
                userId,
                contactId: contact?.id,
                actionType: 'send_email',
                priority: 10,
                title: 'Sent "Hot Lead" Intro (Autonomous)',
                description: 'Response to midnight inquiry.',
                reasoning: 'Inquiry received while offline.',
                intelligenceSources: [{ type: 'inquiry', id: 'inq-001', summary: 'New inquiry' }],
                status: 'completed',
                mode: 'full_god',
                executedAt: new Date(now.getTime() - oneDay - oneHour), // Yesterday
            },
            {
                userId,
                contactId: contact?.id,
                actionType: 'send_email',
                priority: 5,
                title: 'Friday Follow-up: Property Update',
                description: 'Regular update sent to active lead.',
                reasoning: 'Weekly engagement touchpoint.',
                intelligenceSources: [{ type: 'activity', id: 'act-123', summary: 'Active Lead' }],
                status: 'completed',
                mode: 'full_god',
                executedAt: new Date(now.getTime() - 2 * oneDay), // 2 days ago
            },
            {
                userId,
                contactId: contact?.id,
                actionType: 'archive_contact',
                priority: 3,
                title: 'Archived Dead Lead (Autonomous)',
                description: 'Inactive contact archived due to no response for 90 days.',
                reasoning: 'Lead has not opened last 5 emails.',
                intelligenceSources: [{ type: 'engagement', id: 'eng-456', summary: '0% open rate' }],
                status: 'completed',
                mode: 'full_god',
                executedAt: new Date(now.getTime() - 10 * oneDay), // Last Week Range
            },
            {
                userId,
                contactId: contact?.id,
                actionType: 'update_category',
                priority: 4,
                title: 'Market Snapshot Sent (Autonomous)',
                description: 'Monthly market update sent to cold database.',
                reasoning: 'Database warming campaign.',
                intelligenceSources: [{ type: 'campaign', id: 'camp-789', summary: 'Market Warming' }],
                status: 'completed',
                mode: 'full_god',
                executedAt: new Date(now.getTime() - 25 * oneDay), // Last Month Range
            },
            {
                userId,
                contactId: contact?.id,
                actionType: 'send_email',
                priority: 2,
                title: 'Legacy Action Recovery',
                description: 'Recovered action from older system data.',
                reasoning: 'Data migration cleanup.',
                intelligenceSources: [{ type: 'migration', id: 'mig-001', summary: 'Legacy Data' }],
                status: 'completed',
                mode: 'full_god',
                executedAt: new Date(now.getTime() - 60 * oneDay), // Older
            }
        ]
    });

    // 4. CREATE APPROVED ACTIONS (Demi-God Mode History)
    await prisma.autonomousAction.createMany({
        data: [
            {
                userId,
                contactId: contact?.id,
                actionType: 'send_email',
                priority: 6,
                title: 'Approved: Nurture Email to Emma Davis',
                description: 'Manual approval of nurture suggestion.',
                reasoning: 'Emma is a "Cold Nurture" lead.',
                intelligenceSources: [{ type: 'category', id: 'cat-001', summary: 'Cold Nurture' }],
                status: 'completed',
                mode: 'demi_god',
                approvedAt: new Date(now.getTime() - 3 * oneDay),
                executedAt: new Date(now.getTime() - 3 * oneDay + oneHour),
            }
        ]
    });

    console.log('Successfully generated mock Godmode actions!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
