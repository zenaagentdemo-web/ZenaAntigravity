
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { agentOrchestrator } from '../services/agent-orchestrator.service.js';
import { sessionManager } from '../services/session-manager.service.js';

describe('AgentOrchestrator Session State Invariants', () => {
    const userId = 'test-user-property';

    beforeEach(() => {
        // Clear sessions before each test run
        // @ts-ignore - access private
        sessionManager.sessions.clear();
    });

    it('Property: Successful creation MUST update recentEntities and currentFocus', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('property', 'contact', 'deal'),
                fc.record({
                    id: fc.uuid(),
                    name: fc.string({ minLength: 1 }),
                    address: fc.string({ minLength: 1 }),
                    propertyAddress: fc.string({ minLength: 1 })
                }),
                async (domain, data) => {
                    const session = sessionManager.getOrCreateSession(userId);

                    // Normalize data based on domain like AgentOrchestrator does
                    let normalizedData = { ...data };
                    if (domain === 'property') normalizedData = { property: { id: data.id, address: data.address } };

                    // Trigger the tracking logic (private method)
                    // @ts-ignore
                    agentOrchestrator.trackEntitiesFromResult(session.sessionId, domain, normalizedData);

                    // Check recentEntities
                    const key = domain === 'property' ? 'properties' : (domain + 's');
                    const entities = session.recentEntities[key as any] as any[];
                    const isTracked = entities.some(e => e.id === data.id);

                    // Check focus
                    const isFocused = session.currentFocus.type === domain && session.currentFocus.id === data.id;

                    // INVARIANT: Correct tracking and focus
                    // Currently, we expect this to FAIL for Focus because it's not implemented yet.
                    return isTracked && isFocused;
                }
            )
        );
    });
});
