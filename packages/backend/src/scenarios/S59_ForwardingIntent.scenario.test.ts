
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import { aiProcessingService } from '../services/ai-processing.service.js';

vi.mock('../services/ai-processing.service.js', () => ({
    aiProcessingService: { processWithLLM: vi.fn().mockResolvedValue('Contact: Bob, Role: Buyer') }
}));

const mockRequest = (body: any, userId: string) => ({
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S59: Forwarding Intent', () => {
    it('should extract contact info from forwarded email', async () => {
        const userId = 'user-59';
        const res = mockResponse();

        await threadsController.forward(mockRequest({ content: 'Forwarding this buyer John from REA' }, userId), res);

        expect(aiProcessingService.processWithLLM).toHaveBeenCalledWith(expect.stringContaining('Forwarding this buyer John from REA'));
        expect(res.status).toHaveBeenCalledWith(200);
        console.log("✅ Scenario S59 Passed: Forwarding Intent verified");
    });
});
