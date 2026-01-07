/**
 * Seed Godmode Actions Script
 * Hits the /api/godmode/seed-mock endpoint or runs the logic directly.
 * For simplicity in local dev, we hit the database directly.
 */

import prisma from '../src/config/database.js';

async function main() {
    console.log('🚀 Seeding Godmode Mock Actions...');

    try {
        // 1. Find the demo user or first user with contacts
        let user = await prisma.user.findUnique({
            where: { email: 'demo@zena.ai' }
        });

        if (!user || (await prisma.contact.count({ where: { userId: user.id } })) === 0) {
            user = await prisma.user.findFirst({
                where: {
                    contacts: {
                        some: {}
                    }
                }
            });
        }

        if (!user) {
            console.error('❌ No user with contacts found in database. Please run npm run db:seed first.');
            process.exit(1);
        }

        const userId = user.id;
        console.log(`👤 Using User: ${user.name || user.email || userId}`);

        // 2. Clear existing pending actions to avoid clutter
        await prisma.autonomousAction.deleteMany({
            where: { userId, status: 'pending' }
        });
        console.log('🗑️  Cleared existing pending actions.');

        // 3. Get contacts and properties
        const contacts = await prisma.contact.findMany({ where: { userId }, take: 5 });
        const properties = await prisma.property.findMany({ where: { userId }, take: 3 });

        if (contacts.length === 0) {
            console.error('❌ No contacts found. Cannot seed actions.');
            process.exit(1);
        }

        const mockActions = [
            {
                userId,
                contactId: contacts[0]?.id,
                actionType: 'send_email',
                priority: 8,
                title: `Re-engage ${contacts[0]?.name} (High churn risk)`,
                description: `WHY IT MATTERS: This contact has reached a high churn risk threshold due to recent inactivity. GAIN: Sending a personalized re-engagement email now will rebuild trust and ensure they choose you when they are ready to transact.`,
                draftSubject: `Thinking of you - ${contacts[0]?.name?.split(' ')[0]}`,
                draftBody: `Hi ${contacts[0]?.name?.split(' ')[0]},\n\nI wanted to check in and see if you had any questions about the properties we discussed. I'd be happy to arrange viewings at your convenience.\n\nBest regards`,
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'Contact has been inactive for 5 days after showing high interest signals',
                intelligenceSources: [{ type: 'prediction', id: contacts[0]?.id, summary: 'Churn Risk: 0.82' }]
            },
            {
                userId,
                contactId: contacts[1]?.id || contacts[0]?.id,
                actionType: 'schedule_followup',
                priority: 9,
                title: `Follow up with ${contacts[1]?.name || contacts[0]?.name} (High sell intent)`,
                description: `WHY IT MATTERS: Our neural analysis detected a 85% sell probability based on their specific digital behavior and engagement patterns. GAIN: By offering a market appraisal now, you establish yourself as the proactive expert.`,
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'Predictive analysis indicates a 85% probability that the contact is preparing to sell.',
                intelligenceSources: [{ type: 'prediction', id: contacts[1]?.id || contacts[0]?.id, summary: 'Sell Probability: 85%' }]
            },
            ...(properties.length > 0 ? [
                {
                    userId,
                    propertyId: properties[0].id,
                    actionType: 'generate_weekly_report',
                    priority: 8,
                    title: `Weekly Vendor Report: ${properties[0].address.split(',')[0]}`,
                    description: `WHY IT MATTERS: Campaign has been active for 7+ days. Regular reporting builds trust and transparency with vendors. GAIN: Vendors who receive weekly updates are 40% more likely to agree to price adjustments when recommended.`,
                    reasoning: 'Campaign has been active for 7+ days. Regular reporting schedule triggered.',
                    draftSubject: `Weekly Campaign Activity - ${properties[0].address}`,
                    draftBody: `## Executive Summary\nInterest remains steady for ${properties[0].address}. We've seen a slight increase in online engagement this week.\n\n## Traffic & Engagement\n- Total Views: 124 (+12% from last week)\n- New Inquiries: 3\n\n## Buyer Feedback\n- "Stunning presentation, kitchen is a standout."\n- "A few comments regarding the garden size."\n\n## Strategic Recommendation\nMaintain current pricing for one more week of marketing before reviewing.`,
                    status: 'pending',
                    mode: 'demi_god',
                    payload: { pdfUrl: 'mock-report-123.pdf', reportId: 'rep_12345' },
                    contextSummary: `**Why now?**\nIt has been 7 days since the last report.`
                },
                {
                    userId,
                    propertyId: properties[0].id,
                    actionType: 'buyer_match_intro',
                    priority: 10,
                    title: `Hot Buyer Match: Sarah Jenkins (95%)`,
                    description: `Sarah matches ${properties[0].address.split(',')[0]} 95% based on her requirements. GAIN: Introducing matched buyers immediately while enthusiasm is high will create competitive tension.`,
                    reasoning: 'High-intent buyer active in this price bracket. Early engagement significantly increases conversion probability.',
                    draftSubject: `First look: Perfect match for your search`,
                    draftBody: `Hi Sarah,\n\nI've just listed a property at ${properties[0].address} that I thought of you for immediately. It matches 95% of your requirements.\n\nWould you like to see it before the first open home?`,
                    script: `Hey Sarah, Hamish here. Look, I'm standing in a living room on ${properties[0].address.split(',')[0]} and I thought of you immediately. It's got the master suite you wanted. Can you get here in 20 mins?`,
                    status: 'pending',
                    mode: 'demi_god',
                    contextSummary: `**Why Sarah?**\n- 95% Match Score\n- Viewed 3 similar open homes this month`,
                    payload: { matchedBuyer: { name: 'Sarah Jenkins', matchScore: 95 } }
                }
            ] : []),
            {
                userId,
                contactId: contacts[2]?.id || contacts[0]?.id,
                actionType: 'crm_sync',
                priority: 10,
                title: `Unsynced Changes Detected (15)`,
                description: 'WHY IT MATTERS: You have 15 updates in Zena that are not yet in your CRM. GAIN: Syncing now ensures your CRM remains the single source of truth.',
                reasoning: 'Found 15 records where updatedAt > lastCrmExportAt.',
                status: 'pending',
                mode: 'demi_god',
                payload: { deltaCount: 15, contacts: 10, properties: 5 }
            }
        ];

        for (const action of mockActions) {
            await prisma.autonomousAction.create({
                data: action as any
            });
        }

        console.log(`✅ Successfully seeded ${mockActions.length} pending actions.`);
    } catch (error) {
        console.error('❌ Error seeding godmode actions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
