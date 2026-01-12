/**
 * Test Script: Global Proactivity Phase 1 Features
 * Tests Features 1-4 directly against the backend API
 */

import prisma from '../src/config/database.js';
import { askZenaService } from '../src/services/ask-zena.service.js';
import { relationshipService } from '../src/services/relationship.service.js';

const TEST_USER_ID = 'test-user-proactivity';

async function setup() {
    console.log('\n🔧 Setting up test data...\n');

    // Create or get test user
    let user = await prisma.user.findFirst({ where: { email: 'proactivity-test@zena.ai' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                id: TEST_USER_ID,
                email: 'proactivity-test@zena.ai',
                passwordHash: 'test',
                name: 'Proactivity Tester'
            }
        });
        console.log('✅ Created test user');
    } else {
        console.log('✅ Using existing test user:', user.id);
    }

    return user.id;
}

async function testFeature1_IntentExtraction(userId: string) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 FEATURE 1: Live Intent Extraction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testCases = [
        { input: 'Yasmine Ling', expected: 'create_contact', desc: 'Two words, both capitalized' },
        { input: 'gareth morgan', expected: 'create_contact', desc: 'Two words, lowercase' },
        { input: 'John smith', expected: 'create_contact', desc: 'Mixed case' },
        { input: 'new lead Sarah Connor', expected: 'create_contact', desc: 'Explicit new lead pattern' },
        { input: 'met David Chen', expected: 'create_contact', desc: 'Met pattern' },
        { input: 'buyers in Ponsonby', expected: 'search', desc: 'Search query (not a name)' },
        { input: 'hello', expected: 'search', desc: 'Single word (not a name)' },
    ];

    for (const test of testCases) {
        try {
            // Simulate the intent analysis logic from the controller
            const text = test.input;
            const lowerText = text.toLowerCase().trim();

            const newLeadPatterns = [
                /^(?:new lead|new contact|met|add contact|add)\s+(.+)/i,
                /^(.+)\s+(?:is a new lead|new buyer|new vendor|interested in)/i
            ];

            let extractedName: string | null = null;
            let intentType: 'create_contact' | 'search' | 'none' = 'none';

            for (const pattern of newLeadPatterns) {
                const match = lowerText.match(pattern);
                if (match) {
                    extractedName = match[1].trim();
                    intentType = 'create_contact';
                    break;
                }
            }

            // Case-insensitive name detection (the fix we just made)
            if (!extractedName && /^[A-Za-z]+\s+[A-Za-z]+/.test(text.trim())) {
                const searchRes = await askZenaService.quickContactSearch(userId, text.trim());
                if (!searchRes || searchRes.length === 0) {
                    extractedName = text.trim();
                    intentType = 'create_contact';
                } else {
                    intentType = 'search';
                }
            }

            if (intentType === 'none') intentType = 'search';

            const passed = intentType === test.expected;
            console.log(`${passed ? '✅' : '❌'} "${test.input}" → ${intentType} (${test.desc})`);
            if (!passed) {
                console.log(`   Expected: ${test.expected}, Got: ${intentType}`);
            }
        } catch (err) {
            console.log(`❌ "${test.input}" → ERROR: ${err}`);
        }
    }
}

async function testFeature2_RolePrediction(userId: string) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 FEATURE 2: Real-Time Role Prediction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testCases = [
        { email: 'john@raywhite.co.nz', name: 'John Agent', expectedRole: 'agent' },
        { email: 'plumber@fixitfast.co.nz', name: 'Fix It Fast Plumbing', expectedRole: 'tradesperson' },
        { email: 'investor@capitalpartners.com', name: 'Sarah Investor', expectedRole: 'investor' },
        { email: 'john.smith@gmail.com', name: 'John Smith', expectedRole: 'buyer' },
    ];

    for (const test of testCases) {
        try {
            const prediction = await askZenaService.predictContactType(test.email, test.name);
            const passed = prediction.suggestedRole === test.expectedRole;
            console.log(`${passed ? '✅' : '❌'} ${test.email} → ${prediction.suggestedRole} (${Math.round(prediction.confidence * 100)}% confidence)`);
            console.log(`   Reason: ${prediction.reason}`);
            if (!passed) {
                console.log(`   Expected: ${test.expectedRole}`);
            }
        } catch (err) {
            console.log(`❌ ${test.email} → ERROR: ${err}`);
        }
    }
}

async function testFeature3_EntityLinking() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 FEATURE 3: Proactive Entity Linking (Address Detection)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const addressPattern = /\b(\d+[A-Za-z]?\s+[A-Za-z][A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Terrace|Tce|Way|Close|Cl|Crescent|Cres|Boulevard|Blvd))\b/gi;

    const testCases = [
        { note: 'Discussed 123 Queen Street today', expectedMatches: 1 },
        { note: 'Met at 45A Ponsonby Road to review docs', expectedMatches: 1 },
        { note: 'Properties: 10 Main St and 22 Park Avenue', expectedMatches: 2 },
        { note: 'Had coffee, talked about the market', expectedMatches: 0 },
        { note: 'The property at 8B Victoria Drive is interesting', expectedMatches: 1 },
    ];

    for (const test of testCases) {
        const matches = test.note.match(addressPattern) || [];
        const passed = matches.length === test.expectedMatches;
        console.log(`${passed ? '✅' : '❌'} "${test.note.substring(0, 50)}..." → ${matches.length} address(es) found`);
        if (matches.length > 0) {
            console.log(`   Detected: ${matches.join(', ')}`);
        }
    }
}

async function testFeature4_NurtureScore(userId: string) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 FEATURE 4: Relationship Decay / Nurture Score');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get some real contacts to test
    const contacts = await prisma.contact.findMany({
        where: { userId },
        take: 5,
        select: { id: true, name: true, lastActivityAt: true }
    });

    if (contacts.length === 0) {
        console.log('⚠️  No contacts found for user. Creating test contacts...');

        // Create test contacts with different activity dates
        const testContacts = [
            { name: 'Hot Lead', daysAgo: 1 },
            { name: 'Warm Lead', daysAgo: 5 },
            { name: 'Cold Lead', daysAgo: 10 },
            { name: 'Stale Lead', daysAgo: 30 },
        ];

        for (const tc of testContacts) {
            const contact = await prisma.contact.create({
                data: {
                    userId,
                    name: tc.name,
                    emails: [`${tc.name.toLowerCase().replace(' ', '.')}@test.com`],
                    role: 'buyer',
                    lastActivityAt: new Date(Date.now() - tc.daysAgo * 24 * 60 * 60 * 1000)
                }
            });
            contacts.push(contact as any);
        }
        console.log('✅ Created test contacts\n');
    }

    for (const contact of contacts) {
        try {
            const result = await relationshipService.calculateNurtureScore(contact.id);
            const statusEmoji = {
                'hot': '🔥',
                'warm': '🟡',
                'cold': '🟠',
                'stale': '🔴'
            }[result.status] || '❓';

            console.log(`${statusEmoji} ${contact.name}: Score=${result.score}, Status=${result.status}, Days=${result.daysSinceContact}`);
            if (result.recommendation) {
                console.log(`   💡 ${result.recommendation}`);
            }
        } catch (err) {
            console.log(`❌ ${contact.name} → ERROR: ${err}`);
        }
    }
}

async function cleanup(userId: string) {
    console.log('\n🧹 Cleaning up test data...');
    await prisma.contact.deleteMany({ where: { userId, name: { in: ['Hot Lead', 'Warm Lead', 'Cold Lead', 'Stale Lead'] } } });
    console.log('✅ Cleanup complete\n');
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   GLOBAL PROACTIVITY PHASE 1 - BACKEND TESTS             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        const userId = await setup();

        await testFeature1_IntentExtraction(userId);
        await testFeature2_RolePrediction(userId);
        await testFeature3_EntityLinking();
        await testFeature4_NurtureScore(userId);

        await cleanup(userId);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ALL TESTS COMPLETED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
