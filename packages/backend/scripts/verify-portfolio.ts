import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/database.js';
import { portfolioIntelligenceService } from '../src/services/portfolio-intelligence.service.js';

async function verifyPortfolioIntelligence() {
    console.log('--- Phase 6: Portfolio Intelligence Verification ---');

    try {
        // 1. Find a test user
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error('No user found to run verification.');
            return;
        }

        // 2. Create/Find a contact for the test
        let contact = await prisma.contact.findFirst({
            where: { name: 'Sarah Jenkins (Portfolio Test)' }
        });

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    userId: user.id,
                    name: 'Sarah Jenkins (Portfolio Test)',
                    role: 'vendor',
                    emails: ['sarah.j@example.com']
                }
            });
        }

        // 3. Create two active deals for this contact to trigger portfolio analysis
        // Deal 1: Selling her current home
        const deal1 = await prisma.deal.create({
            data: {
                userId: user.id,
                pipelineType: 'seller',
                stage: 'PROPOSAL_SENT',
                summary: 'Selling 12A Richmond Road to fund a downsize.',
                dealValue: 1200000,
                status: 'active',
                nextActionOwner: 'agent',
                contacts: { connect: { id: contact.id } }
            }
        });

        // Deal 2: Buying a new apartment
        const deal2 = await prisma.deal.create({
            data: {
                userId: user.id,
                pipelineType: 'buyer',
                stage: 'SEARCHING',
                summary: 'Looking for a high-end apartment in Ponsonby.',
                dealValue: 950000,
                status: 'active',
                nextActionOwner: 'agent',
                contacts: { connect: { id: contact.id } }
            }
        });

        console.log(`✅ Created simulation for ${contact.name} with ${contact.id}`);
        console.log(`   - Seller Deal: ${deal1.id}`);
        console.log(`   - Buyer Deal: ${deal2.id}`);

        // 4. Trigger Portfolio Analysis
        console.log('--- Triggering AI Portfolio Synthesis ---');
        const brief = await portfolioIntelligenceService.analyzePortfolio(user.id, contact.id, true);

        if (brief) {
            console.log('✅ PORTFOLIO BRIEF GENERATED:');
            console.log(`   Strategy: ${brief.strategyType}`);
            console.log(`   Summary: ${brief.summary}`);
            console.log(`   Next Step: ${brief.overallNextStep}`);

            if (brief.dependencies.length > 0) {
                console.log('✅ DEPENDENCIES DETECTED:');
                brief.dependencies.forEach((d: any) => {
                    console.log(`   - [${d.riskLevel}] ${d.description}`);
                });
            } else {
                console.warn('⚠️ No dependencies detected (Expected for Selling-to-Buy).');
            }
        } else {
            console.error('❌ Failed to generate portfolio brief.');
        }

        // Clean up test data (optional, but good for repeatability)
        // await prisma.deal.deleteMany({ where: { id: { in: [deal1.id, deal2.id] } } });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

verifyPortfolioIntelligence();
