/**
 * Phase 8: Global Portfolio Intelligence Verification Script
 * This script seeds a complex portfolio of 15+ deals across different stages, 
 * including some risks and a hidden internal buyer match, then verifies 
 * Zena's global analysis output.
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/database.js';
import { portfolioIntelligenceService } from '../src/services/portfolio-intelligence.service.js';
import { AskZenaService } from '../src/services/ask-zena.service.js';

async function verifyGlobalIntelligence() {
    console.log('--- Phase 8: Global Portfolio Intelligence Verification ---');

    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No user found');

        // 1. Cleanup old test data
        await prisma.deal.deleteMany({ where: { userId: user.id, summary: { contains: '[TEST-PHASE-8]' } } });

        console.log('🧹 Cleaned up old test data.');

        // 2. Seed 15 Deals with varying states
        const stages = ['PROSPECT', 'LISTED', 'UNDER_CONTRACT', 'SETTLED'];
        const summaries = [
            '10-12 Broadway Penthouse', '55 Sunset Blvd Family Home', '3/14 Regent Street Apartment',
            'Beachfront Villa Waiheke', 'Modern Office Suite Parnell', 'Retirement Unit Albany',
            'Industrial Warehouse Otahuhu', 'Boutique Retail Space Grey Lynn', 'Empty Lot Riverhead',
            'Renovation Project Glen Innes', 'Character Home Kingsland', 'Modern Townhouse Hobsonville',
            'Executive Estate Coatesville', 'Urban Loft Customs St', 'Family Bungalow Sandringham'
        ];

        console.log(`🌱 Seeding 15 deals...`);
        for (let i = 0; i < 15; i++) {
            const stage = stages[i % stages.length];
            const price = 800000 + (Math.random() * 2000000);

            await prisma.deal.create({
                data: {
                    userId: user.id,
                    summary: `[TEST-PHASE-8] ${summaries[i]}`,
                    stage: stage,
                    status: 'active',
                    dealValue: price,
                    riskLevel: i % 5 === 0 ? 'medium' : 'none',
                    nextAction: i % 5 === 0 ? 'Resolve building report issue' : 'Regular follow-up',
                    nextActionOwner: 'agent',
                    pipelineType: i % 3 === 0 ? 'seller' : 'buyer'
                }
            });
        }

        // 3. Create a Hidden Opportunity Match
        // Buyer Profile
        const buyer = await prisma.contact.create({
            data: {
                userId: user.id,
                name: '[TEST-PHASE-8] Matching Buyer',
                role: 'buyer',
                emails: ['match.buyer@example.com'],
                zenaIntelligence: {
                    preferences: {
                        location: 'Parnell',
                        budget: 2500000,
                        bedrooms: 3
                    }
                }
            }
        });

        // Target Listing
        const property = await prisma.property.create({
            data: {
                userId: user.id,
                address: '[TEST-PHASE-8] 12A Parnell Rd',
                status: 'active',
                listingPrice: 2450000
            }
        });

        // Add a deal for this listing to make it a "listing"
        await prisma.deal.create({
            data: {
                userId: user.id,
                propertyId: property.id,
                summary: `[TEST-PHASE-8] Listing for 12A Parnell Rd`,
                stage: 'LISTED',
                status: 'active',
                pipelineType: 'seller',
                nextActionOwner: 'agent'
            }
        });

        console.log('✅ Portolio seeded successfully.');

        // 4. Run Global Analysis
        console.log('\n--- Running Portfolio Analysis ---');
        const analysis = await portfolioIntelligenceService.analyzeGlobalPortfolio(user.id);

        console.log('\n📊 EXECUTIVE SUMMARY:');
        console.log(analysis.summary);
        console.log(`Total Pipeline Value: $${analysis.totalValue.toLocaleString()}`);
        console.log(`Health Score: ${analysis.healthScore}/100`);

        console.log('\n🚨 RISK CLUSTERS:');
        console.log(JSON.stringify(analysis.riskClusters, null, 2));

        console.log('\n🤝 OPPORTUNITY MATCHES:');
        console.log(JSON.stringify(analysis.opportunities, null, 2));

        // Verification checks
        const hasMatchingBuyer = analysis.opportunities.some(o => o.buyerName.includes('Matching Buyer'));
        const hasRiskClusters = analysis.riskClusters.length > 0;

        if (hasMatchingBuyer) {
            console.log('\n✅ SUCCESS: Zena identified the internal matching opportunity.');
        } else {
            console.error('\n❌ FAIL: Zena missed the internal buyer match.');
        }

        if (hasRiskClusters) {
            console.log('✅ SUCCESS: Zena clustered risks correctly.');
        } else {
            console.error('❌ FAIL: No risk clusters detected despite multiple medium risk deals.');
        }

        // 5. Verify via Natural Language (Ask Zena)
        console.log('\n--- Verifying via Ask Zena Query ---');
        const askZenaService = new AskZenaService();
        const response = await askZenaService.processQuery({
            userId: user.id,
            query: "Give me an executive summary of my business and the top risks."
        });

        console.log('\n🤖 ZENA AGENT RESPONSE:');
        console.log(response.answer);

        if (response.answer.includes('Parnell') || response.answer.includes('clusters') || response.answer.includes('15 deals')) {
            console.log('\n✅ SUCCESS: Ask Zena correctly routed to and summarized the portfolio tools.');
        } else {
            console.error('\n❌ FAIL: Ask Zena response did not reflect portfolio analysis data.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

verifyGlobalIntelligence();
