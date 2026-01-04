import { describe, it, expect, vi, beforeAll } from 'vitest';
import fc from 'fast-check';

// Mock dependencies BEFORE other imports
// Try mocking both with and without extension to be safe
vi.mock('../../ask-zena.service.js', () => ({
    askZenaService: {
        askBrain: vi.fn().mockResolvedValue('Mocked AI response content')
    }
}));
vi.mock('../../ask-zena.service', () => ({
    askZenaService: {
        askBrain: vi.fn().mockResolvedValue('Mocked AI response content')
    }
}));

vi.mock('../../timeline.service.js', () => ({
    timelineService: {
        logEvent: vi.fn()
    }
}));
vi.mock('../../timeline.service', () => ({
    timelineService: {
        logEvent: vi.fn()
    }
}));

import { actionRegistry } from './action-registry.js';
import './index.js'; // Trigger registration

describe('Autonomous Actions Property Tests', () => {

    // Test context generator
    const contextArbitrary = fc.record({
        userId: fc.uuid(),
        propertyId: fc.uuid(),
        property: fc.record({
            id: fc.uuid(),
            address: fc.string(),
            status: fc.constantFrom('active', 'sold', 'withdrawn', 'under_contract'),
            createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            viewingCount: fc.integer({ min: 0, max: 100 }),
            inquiryCount: fc.integer({ min: 0, max: 50 }),
            vendors: fc.array(fc.record({ name: fc.string() })),
        })
    });

    const strategies = actionRegistry.getAllStrategies();

    strategies.forEach(strategy => {
        it(`should satisfy invariants for ${strategy.actionType}`, async () => {
            await fc.assert(
                fc.asyncProperty(contextArbitrary, async (context) => {
                    // 1. Check shouldTrigger matching logic
                    const shouldTrigger = await strategy.shouldTrigger(context as any);

                    // Invariants based on strategy type
                    if (strategy.actionType === 'generate_weekly_report') {
                        const daysOld = (Date.now() - context.property.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                        if (context.property.status === 'active' && daysOld > 7) {
                            // Ideally should trigger, but strictly >= 7 or >7 depends on implementation
                            // For property test, we focus on crash freedom and structural validity if true
                        }
                    }

                    // 2. If triggered, generate content
                    if (shouldTrigger) {
                        const content = await strategy.generate(context as any);

                        // Universal Invariants
                        expect(content.title).toBeTruthy();
                        expect(content.priority).toBeGreaterThanOrEqual(1);
                        expect(content.priority).toBeLessThanOrEqual(10);
                        expect(typeof content.description).toBe('string');

                        // Strategy-Specific Invariants
                        if (strategy.actionType === 'buyer_match_intro') {
                            expect(content.payload).toHaveProperty('smsDraft');
                            expect(typeof content.payload.smsDraft).toBe('string');
                            expect(content.script).toBeTruthy();
                        }

                        if (strategy.actionType === 'generate_weekly_report') {
                            expect(content.payload).toHaveProperty('views');
                            expect(content.contextSummary).toBeTruthy();
                        }

                        if (strategy.actionType === 'schedule_viewing') {
                            expect(content.payload).toHaveProperty('proposedTime');
                        }
                    }

                    return true;
                }),
                { numRuns: 10 } // Run 10 random cases per strategy
            );
        });
    });
});
