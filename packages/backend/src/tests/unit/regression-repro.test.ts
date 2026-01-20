import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolRegistry } from '../../tools/registry.js';
import { createPropertyTool } from '../../tools/properties/create-property.tool.js';
import { sessionManager } from '../../services/session-manager.service.js';

toolRegistry.register(createPropertyTool);

// We need to mock dependencies that are not available in unit test environment
vi.mock('../../config/database.js', () => ({
    default: {
        chatMessage: { create: vi.fn().mockResolvedValue({}) },
        property: { findFirst: vi.fn(), count: vi.fn().mockResolvedValue(0) },
        contact: { findFirst: vi.fn(), count: vi.fn().mockResolvedValue(0) },
        deal: { findFirst: vi.fn(), count: vi.fn().mockResolvedValue(0) },
        task: { findFirst: vi.fn(), count: vi.fn().mockResolvedValue(0) }
    }
}));

vi.mock('../../services/logger.service.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        agent: vi.fn()
    }
}));

vi.mock('../../services/websocket.service.js', () => ({
    websocketService: {
        broadcastToUser: vi.fn(),
        broadcastAgentMessage: vi.fn()
    }
}));

vi.mock('../../services/proactive-context.service.js', () => ({
    proactiveContextService: {
        scanForContext: vi.fn().mockResolvedValue({ hasMatches: false, matches: [], suggestedData: {} })
    }
}));

describe('Ask Zena Regression Repro', () => {
    const userId = 'user-123';

    beforeEach(() => {
        sessionManager.getOrCreateSession(userId);
    });

    it('property.create should now have listingPrice as a required field in schema', () => {
        const tool = toolRegistry.getTool('property.create');
        expect(tool?.inputSchema.required).toContain('listingPrice');
    });

    it('should NOT allow auto-execution of property.create if listingPrice is missing', async () => {
        const tool = toolRegistry.getTool('property.create')!;
        const accumulatedParams = { address: '22 Boundary Road, Taupo' };

        // Manual check of the logic we implemented in AgentOrchestrator
        const hasAllRequired = !tool.inputSchema.required || tool.inputSchema.required.every(f =>
            accumulatedParams[f] !== undefined &&
            accumulatedParams[f] !== null &&
            (typeof accumulatedParams[f] !== 'string' || accumulatedParams[f].trim() !== '')
        );

        expect(hasAllRequired).toBe(false);

        // The orchestrator logic should now set shouldAutoExecute to false
        const isCreation = true;
        const isDestructive = false;
        const hasAllRecommended = false;
        const isUpdateOrLog = false;
        const hasExplicitCreateIntent = true;

        const shouldAutoExecute = !isDestructive && hasAllRequired && (
            tool.requiresApproval === false ||
            hasAllRecommended ||
            isUpdateOrLog ||
            hasExplicitCreateIntent
        );

        expect(shouldAutoExecute).toBe(false);
    });

    it('should include listingPrice in missing fields prompt if not provided', () => {
        const tool = toolRegistry.getTool('property.create')!;
        const accumulatedParams = { address: '22 Boundary Road, Taupo' };

        const checkFields = Array.from(new Set([...(tool.recommendedFields || []), ...(tool.inputSchema.required || [])]));
        const missingFields = checkFields.filter(f => !accumulatedParams[f] || (typeof accumulatedParams[f] === 'string' && accumulatedParams[f].trim() === ''));

        expect(missingFields).toContain('listingPrice');

        const fieldLabels = missingFields.map(f => f.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ');
        expect(fieldLabels).toContain('listing price');
    });
});
