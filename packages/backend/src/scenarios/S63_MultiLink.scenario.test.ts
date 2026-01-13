
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { threadLinkingService } from '../services/thread-linking.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { findUnique: vi.fn() },
        thread: { findMany: vi.fn() }
    }
}));

describe('Scenario S63: Inbox Multi-Link', () => {
    it('should find thread for property via contact email match', async () => {
        const propertyId = 'prop-63';
        const contactEmail = 'vendor@63.com';

        (prisma.property.findUnique as any).mockResolvedValue({
            id: propertyId,
            userId: 'u63',
            vendors: [{ emails: [contactEmail] }],
            buyers: []
        });

        (prisma.thread.findMany as any).mockResolvedValue([
            { id: 't63', participants: [{ email: contactEmail }], lastMessageAt: new Date() }
        ]);

        const threads = await threadLinkingService.getThreadsForProperty(propertyId);

        expect(threads.length).toBe(1);
        expect(threads[0].id).toBe('t63');
        console.log("✅ Scenario S63 Passed: Multi-Link via Contact verified");
    });
});
