
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadsController } from '../controllers/threads.controller.js';
import { aiProcessingService } from '../services/ai-processing.service.js';
import prisma from '../config/database.js';

vi.mock('../services/ai-processing.service.js', () => ({
    aiProcessingService: { processWithLLM: vi.fn().mockResolvedValue('Dear Client, I agree...') }
}));

vi.mock('../config/database.js', () => ({
    default: {
        thread: { update: vi.fn() }
    }
}));

const mockRequest = (params: any, body: any, userId: string) => ({
    params,
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S57: Voice-to-Reply', () => {
    it('should convert transcript to a professional draft', async () => {
        const userId = 'user-57';
        const threadId = 'thread-57';
        const res = mockResponse();

        await threadsController.voiceReply(mockRequest({ id: threadId }, { transcript: 'Yeah tell him it is fine' }, userId), res);

        expect(aiProcessingService.processWithLLM).toHaveBeenCalledWith(expect.stringContaining('Yeah tell him it is fine'));
        expect(prisma.thread.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: threadId },
            data: { draftResponse: 'Dear Client, I agree...' }
        }));
        console.log("✅ Scenario S57 Passed: Voice-to-Reply verified");
    });
});
