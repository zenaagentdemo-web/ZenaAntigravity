
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { MorningBriefService, MorningBriefContact, MorningBriefEmail, AwaitingReply } from './morning-brief.service';

// Mock dependencies using vi.hoisted to avoid ReferenceError
const mocks = vi.hoisted(() => ({
    mockPrisma: {
        contact: { findMany: vi.fn(), findUnique: vi.fn() },
        thread: { findMany: vi.fn(), update: vi.fn(), fields: { lastReplyAt: 'lastReplyAt' } },
        task: { findMany: vi.fn() },
        timelineEvent: { findMany: vi.fn() },
        deal: { findMany: vi.fn() }
    },
    mockAskZenaService: {
        askBrain: vi.fn()
    },
    mockNurtureService: {
        getPendingTouches: vi.fn()
    }
}));

// Mock local imports
vi.mock('../config/database.js', () => ({ default: mocks.mockPrisma }));
vi.mock('./ask-zena.service.js', () => ({ askZenaService: mocks.mockAskZenaService }));
vi.mock('./nurture.service.js', () => ({ nurtureService: mocks.mockNurtureService }));
vi.mock('./logger.service.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { mockPrisma, mockNurtureService } = mocks;


describe('MorningBriefService Properties', () => {

    it('should maintain invariants: Stats match data and limits respected', async () => {
        const service = new MorningBriefService();

        // Generators for mock data
        const contactsArb = fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string(),
            emails: fc.array(fc.emailAddress()),
            role: fc.string(),
            prediction: fc.option(fc.record({ churnRisk: fc.float(), sellProbability: fc.float(), buyProbability: fc.float() })),
            lastActivityAt: fc.option(fc.date()).map(d => d || null)
        }));

        const threadsArb = fc.array(fc.record({
            id: fc.uuid(),
            subject: fc.string(),
            messages: fc.constant([{ from: { name: 'Sender' }, receivedAt: new Date(), body: 'body' }])
        }));

        await fc.assert(
            fc.asyncProperty(contactsArb, threadsArb, async (contacts, threads) => {
                // Setup Mocks
                mockNurtureService.getPendingTouches.mockResolvedValue([]);
                mockPrisma.contact.findMany.mockResolvedValue(contacts.slice(0, 10)); // Simulate DB limit
                mockPrisma.thread.findMany.mockResolvedValue(threads.slice(0, 5));
                mockPrisma.task.findMany.mockResolvedValue([]);
                mockPrisma.timelineEvent.findMany.mockResolvedValue([]);
                mockPrisma.deal.findMany.mockResolvedValue([]);

                // Act
                const brief = await service.generateMorningBrief('user-id');

                // Assert Invariants

                // 1. Stats Validity
                expect(brief.stats.totalPriorityContacts).toBe(brief.priorityContacts.length);
                expect(brief.stats.unreadEmails).toBe(brief.unreadEmails.length);

                // 2. Limits
                expect(brief.priorityContacts.length).toBeLessThanOrEqual(10);
                expect(brief.unreadEmails.length).toBeLessThanOrEqual(5);

                // 3. Structure
                expect(brief.date).toBeDefined();
                expect(Array.isArray(brief.priorityContacts)).toBe(true);
            })
        );
    });
});
