import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ProactiveContextService } from '../../services/proactive-context.service.js';
import { agentOrchestrator } from '../../services/agent-orchestrator.service.js';

describe('Zena Invariants: Session Isolation & Button Generation', () => {

    describe('ProactiveContextService Cache Isolation', () => {
        let service: ProactiveContextService;

        beforeEach(() => {
            service = new ProactiveContextService();
        });

        it('should maintain independent caches for different users (Property-Based)', async () => {
            // @ts-ignore - Accessing private cache for testing
            const cache = service.webSearchCache;

            await fc.assert(
                fc.asyncProperty(
                    fc.uuid(), // userId A
                    fc.uuid(), // userId B
                    fc.string({ minLength: 5 }), // address
                    async (userIdA, userIdB, address) => {
                        fc.pre(userIdA !== userIdB);

                        cache.clear();

                        // 🧠 ZENA TEST INTEL: Instead of spying on private methods which is brittle,
                        // we directly verify that different UserIDs produce different keys in the cache.

                        // 🧠 ZENA TEST INTEL: Mock the slow web search to keep tests hermetic and fast.
                        // @ts-ignore
                        vi.spyOn(service, 'searchWebForProperty').mockResolvedValue({
                            source: 'property',
                            id: 'web',
                            title: 'Test Property',
                            snippet: 'Mock snippet',
                            relevance: 90
                        });

                        // Execution as User A
                        // @ts-ignore
                        await service.searchWebForPropertyCached(userIdA, address);
                        const sizeAfterA = cache.size;

                        // Execution as User B
                        // @ts-ignore
                        await service.searchWebForPropertyCached(userIdB, address);

                        // IF THEY SHARE A KEY, size will be 1 after both calls.
                        // IF THEY ARE ISOLATED, size will be 2.
                        expect(cache.size).toBe(sizeAfterA + 1);

                        const keys = Array.from(cache.keys()) as string[];
                        expect(keys.some(k => k.startsWith(userIdA))).toBe(true);
                        expect(keys.some(k => k.startsWith(userIdB))).toBe(true);
                    }
                )
            );
        });
    });

    describe('AgentOrchestrator Button Generation', () => {
        it('should correctly generate [PRODUCT_BUTTON] for all supported domains', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        tool: fc.constantFrom('property.create', 'contact.create', 'task.update', 'calendar.add_event'),
                        result: fc.record({
                            data: fc.record({
                                id: fc.uuid().filter(id => id.length > 0),
                                name: fc.string({ minLength: 1 }),
                                address: fc.string({ minLength: 1 }),
                                label: fc.string({ minLength: 1 }),
                                summary: fc.string({ minLength: 1 }),
                                title: fc.string({ minLength: 1 }),
                            })
                        })
                    }),
                    (toolResult) => {
                        const buttons = agentOrchestrator.generateProductButtons([toolResult]);

                        // INVARIANT: Every successful creation/update must yield a button
                        expect(buttons).toContain('[PRODUCT_BUTTON:');

                        // INVARIANT: Button path matches domain
                        if (toolResult.tool.includes('property')) expect(buttons).toContain('/properties/');
                        if (toolResult.tool.includes('contact')) expect(buttons).toContain('/contacts/');
                        if (toolResult.tool.includes('task')) expect(buttons).toContain('/tasks');
                        if (toolResult.tool.includes('calendar')) expect(buttons).toContain('/calendar');
                    }
                )
            );
        });

        it('should deduplicate buttons for the same entity', () => {
            const sameId = 'test-id';
            const results = [
                { tool: 'property.create', result: { data: { id: sameId, address: 'addr1' } } },
                { tool: 'property.update', result: { data: { id: sameId, address: 'addr1' } } }
            ];

            const buttons = agentOrchestrator.generateProductButtons(results);
            const matches = buttons.match(/PRODUCT_BUTTON/g) || [];

            expect(matches.length).toBe(1);
        });
    });
});
