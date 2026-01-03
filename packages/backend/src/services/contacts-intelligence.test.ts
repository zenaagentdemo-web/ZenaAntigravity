import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import prisma from '../config/database.js';

/**
 * Unit Tests for Contacts Service - AI Functions
 * Tests Oracle predictions, Godmode actions, and engagement scoring
 */

// Mock external services
vi.mock('./websocket.service.js', () => ({
    websocketService: {
        broadcastToUser: vi.fn(),
        broadcastContactEngagement: vi.fn(),
        broadcastContactCategorization: vi.fn()
    }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AskZenaService - Contact Intelligence', () => {
    let testUserId: string;
    let testContactId: string;

    beforeEach(async () => {
        // Create test user and contact
        const user = await prisma.user.create({
            data: {
                email: `contact-test-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Contact Test User'
            }
        });
        testUserId = user.id;

        const contact = await prisma.contact.create({
            data: {
                userId: testUserId,
                name: 'Test Contact',
                emails: ['test@example.com'],
                phones: ['+61412345678'],
                role: 'buyer',
                intelligenceSnippet: 'Active buyer looking for family home'
            }
        });
        testContactId = contact.id;

        vi.clearAllMocks();
    });

    afterEach(async () => {
        try {
            await prisma.contact.deleteMany({ where: { userId: testUserId } });
            await prisma.user.delete({ where: { id: testUserId } });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('generateCallIntel', () => {
        it('should return call intelligence with required fields', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    bestTime: 'Weekdays 9am-5pm',
                                    lastInteraction: 'Sent property details yesterday',
                                    talkingPoints: ['Discuss budget', 'Confirm pre-approval', 'Schedule viewing']
                                })
                            }]
                        }
                    }]
                })
            });

            const { askZenaService } = await import('./ask-zena.service.js');
            const result = await askZenaService.generateCallIntel(testUserId, testContactId);

            expect(result).toBeDefined();
            expect(typeof result.bestTime).toBe('string');
            expect(typeof result.lastInteraction).toBe('string');
            expect(Array.isArray(result.talkingPoints)).toBe(true);
            expect(result.talkingPoints.length).toBeGreaterThan(0);
        });
    });

    describe('generateImprovementActions', () => {
        it('should return improvement tips and best action', async () => {
            const { askZenaService } = await import('./ask-zena.service.js');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    tips: ['Send market update', 'Schedule follow-up call'],
                                    bestAction: {
                                        type: 'email',
                                        description: 'Send personalized market report'
                                    },
                                    explanation: 'Contact has been quiet for 2 weeks'
                                })
                            }]
                        }
                    }]
                })
            });

            const contact = await prisma.contact.findUnique({ where: { id: testContactId } });
            const result = await askZenaService.generateImprovementActions(testUserId, {
                id: testContactId,
                name: contact!.name,
                role: contact!.role,
                engagementScore: 50
            });

            expect(result).toBeDefined();
            expect(Array.isArray(result.tips)).toBe(true);
            expect(result.bestAction).toBeDefined();
            expect(['email', 'call', 'task']).toContain(result.bestAction.type);
        });
    });

    describe('parseSearchQuery', () => {
        it('should parse natural language contact search', async () => {
            const { askZenaService } = await import('./ask-zena.service.js');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    role: 'buyer',
                                    category: 'hot',
                                    dealStage: 'viewing',
                                    keywords: 'residential',
                                    aiInsight: 'Showing buyers actively viewing properties'
                                })
                            }]
                        }
                    }]
                })
            });

            const result = await askZenaService.parseSearchQuery(testUserId, 'hot buyers viewing residential');

            expect(result).toBeDefined();
            expect(result.role).toBe('buyer');
            expect(typeof result.aiInsight).toBe('string');
        });
    });

    describe('calculateContactEngagement', () => {
        it('should return engagement score and momentum', async () => {
            const { askZenaService } = await import('./ask-zena.service.js');
            const result = await askZenaService.calculateContactEngagement(testContactId);

            expect(result).toBeDefined();
            expect(typeof result.engagementScore).toBe('number');
            expect(result.engagementScore).toBeGreaterThanOrEqual(0);
            expect(result.engagementScore).toBeLessThanOrEqual(100);
            expect(typeof result.momentum).toBe('number');
        });
    });
});

describe('OracleService - Personality Prediction', () => {
    let testUserId: string;
    let testContactId: string;

    beforeEach(async () => {
        const user = await prisma.user.create({
            data: {
                email: `oracle-test-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Oracle Test User'
            }
        });
        testUserId = user.id;

        const contact = await prisma.contact.create({
            data: {
                userId: testUserId,
                name: 'Oracle Test Contact',
                emails: ['oracle@example.com'],
                role: 'buyer'
            }
        });
        testContactId = contact.id;
    });

    afterEach(async () => {
        try {
            await prisma.contact.deleteMany({ where: { userId: testUserId } });
            await prisma.user.delete({ where: { id: testUserId } });
        } catch {
            // Ignore
        }
    });

    it('should have oracle service available', async () => {
        const { oracleService } = await import('./oracle.service.js');
        expect(oracleService).toBeDefined();
    });
});

describe('GodmodeService - Autonomous Actions', () => {
    let testUserId: string;

    beforeEach(async () => {
        const user = await prisma.user.create({
            data: {
                email: `godmode-test-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Godmode Test User'
            }
        });
        testUserId = user.id;
    });

    afterEach(async () => {
        try {
            await prisma.user.delete({ where: { id: testUserId } });
        } catch {
            // Ignore
        }
    });

    it('should have godmode service available', async () => {
        const { godmodeService } = await import('./godmode.service.js');
        expect(godmodeService).toBeDefined();
    });

    it('should have required methods', async () => {
        const { godmodeService } = await import('./godmode.service.js');
        expect(typeof godmodeService.getSettings).toBe('function');
        expect(typeof godmodeService.queueAction).toBe('function');
    });
});
