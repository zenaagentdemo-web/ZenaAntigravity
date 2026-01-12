/**
 * Phase 7: CRM Write Flow Verification Script
 * This script verifies that Zena can parse a write intent, 
 * calculate the new price from a local property record,
 * and generate a correct pendingAction for the frontend.
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/database.js';
import { AskZenaService } from '../src/services/ask-zena.service.js';

async function verifyWriteFlow() {
    console.log('--- Phase 7: CRM Write Flow Verification ---');

    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No user found');

        // 1. Create a Test Property with a Price
        const address = '12A Richmond Road';
        const initialPrice = 1200000;

        // Use upsert to avoid duplicate key issues if running repeatedly
        const property = await prisma.property.upsert({
            where: { id: 'test-property-write-flow' },
            update: { listingPrice: initialPrice },
            create: {
                id: 'test-property-write-flow',
                userId: user.id,
                address: address,
                listingPrice: initialPrice,
                status: 'active'
            }
        });

        console.log(`✅ Created/Updated property: ${address} at $${initialPrice.toLocaleString()}`);

        // 2. Simulate User Request for Price Reduction
        const askZenaService = new AskZenaService();
        const query = {
            userId: user.id,
            query: `Lower the price for ${address} by $10,000 on Trade Me.`
        };

        console.log(`\n--- Processing Query: "${query.query}" ---`);
        const response = await askZenaService.processQuery(query);

        console.log('\n✅ ZENA RESPONSE:');
        console.log(`Answer: ${response.answer}`);

        if (response.pendingAction) {
            console.log('\n✅ PENDING ACTION DETECTED:');
            console.log(`Type: ${response.pendingAction.type}`);
            console.log(`Sub-type: ${response.pendingAction.subType}`);
            console.log(`Description: ${response.pendingAction.description}`);
            console.log(`Payload: ${JSON.stringify(response.pendingAction.payload, null, 2)}`);

            // Verification assertions
            const expectedNewPrice = initialPrice - 10000;
            const actualNewPrice = response.pendingAction.payload.newPrice;

            if (actualNewPrice === expectedNewPrice) {
                console.log(`\n✅ SUCCESS: New price correctly calculated ($${actualNewPrice.toLocaleString()})`);
            } else {
                console.error(`\n❌ FAIL: Price calculation mismatch. Expected $${expectedNewPrice.toLocaleString()}, got $${actualNewPrice?.toLocaleString()}`);
            }

            if (response.pendingAction.description.includes(expectedNewPrice.toLocaleString())) {
                console.log(`✅ SUCCESS: Description correctly informs the user of the final price.`);
            } else {
                console.error(`\n❌ FAIL: Description does not include the calculated final price.`);
            }

        } else {
            console.error('\n❌ FAIL: No pendingAction generated for write intent.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

verifyWriteFlow();
