
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { propertiesController } from '../controllers/properties.controller.js';
import prisma from '../config/database.js';
import { threadLinkingService } from '../services/thread-linking.service.js';
import { neuralScorerService } from '../services/neural-scorer.service.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { findFirst: vi.fn(), update: vi.fn(), findUnique: vi.fn() }
    }
}));

vi.mock('../services/thread-linking.service.js', () => ({
    threadLinkingService: { getThreadsForProperty: vi.fn() }
}));

vi.mock('../services/neural-scorer.service.js', () => ({
    neuralScorerService: { archiveThread: vi.fn() }
}));

const mockRequest = (id: string, body: any, userId: string) => ({
    params: { id },
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S27: Listing Status Sold', () => {
    const mockUserId = 'user-sold-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should archive threads when property is sold', async () => {
        // --- STEP 1: TRIGGER (Sold) ---
        const req = mockRequest('prop-123', { status: 'sold' }, mockUserId);
        const res = mockResponse();

        (prisma.property.findFirst as any).mockResolvedValue({ id: 'prop-123', userId: mockUserId });
        (prisma.property.update as any).mockResolvedValue({ id: 'prop-123', status: 'sold' });
        (threadLinkingService.getThreadsForProperty as any).mockResolvedValue([{ id: 't1' }]);

        // --- STEP 2: REASONING (Auto-Archive Thread) ---
        // --- STEP 3: CONSEQUENCE (Update Score) ---
        await propertiesController.updateProperty(req, res);

        expect(neuralScorerService.archiveThread).toHaveBeenCalledWith('t1');
        console.log("✅ Scenario S27 Passed: Sold -> Threads Archived -> Score Updated");
    });
});
