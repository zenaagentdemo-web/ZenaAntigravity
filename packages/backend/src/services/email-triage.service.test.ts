import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EmailTriageService } from './email-triage.service.js';
import { askZenaService } from './ask-zena.service.js';
import prisma from '../config/database.js';

// Mock Prisma
vi.mock('../config/database.js', () => ({
    default: {
        thread: {
            findMany: vi.fn(),
            fields: {
                lastReplyAt: 'lastReplyAt'
            }
        },
        $transaction: vi.fn()
    }
}));

// Mock AskZenaService
vi.mock('./ask-zena.service.js', () => ({
    askZenaService: {
        askBrain: vi.fn()
    }
}));

describe('EmailTriageService', () => {
    let emailTriageService: EmailTriageService;

    beforeEach(() => {
        emailTriageService = new EmailTriageService();
        vi.clearAllMocks();
    });

    describe('Unit Tests', () => {
        it('should return empty report when no unread threads found', async () => {
            (prisma.thread.findMany as any).mockResolvedValue([]);

            const result = await emailTriageService.generateFullTriageReport('user-1');

            expect(result.unreadCount).toBe(0);
            expect(result.reports).toHaveLength(0);
            expect(result.overallBrief).toContain('Your inbox is looking clear');
        });

        it('should triage unread threads and generate global report', async () => {
            const mockThread = {
                id: 'thread-1',
                subject: 'Test Subject',
                messages: [
                    {
                        body: 'Hello, I wait for your reply.',
                        isFromUser: false,
                        from: { name: 'John Doe', email: 'john@example.com' },
                        sentAt: new Date()
                    }
                ]
            };

            const mockAiTriage = JSON.stringify({
                summary: 'John is waiting for a reply.',
                suggestedReply: 'Hi John, I will get back to you.',
                proactiveActions: [
                    { type: 'CREATE_TASK', label: 'Reply to John', details: {} }
                ],
                urgency: 'high',
                category: 'client_request'
            });

            (prisma.thread.findMany as any).mockResolvedValue([mockThread]);
            (askZenaService.askBrain as any)
                .mockResolvedValueOnce(mockAiTriage) // triageThread
                .mockResolvedValueOnce('Brief: You have 1 new email.'); // generateOverallBrief

            const result = await emailTriageService.generateFullTriageReport('user-1');

            expect(result.unreadCount).toBe(1);
            expect(result.reports).toHaveLength(1);
            expect(result.reports[0].summary).toBe('John is waiting for a reply.');
            expect(result.overallBrief).toBe('Brief: You have 1 new email.');
        });
    });

    describe('Property-Based Tests', () => {
        it('should always return a valid GlobalTriageReport regardless of AI response content', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            subject: fc.string(),
                            messages: fc.array(
                                fc.record({
                                    body: fc.string(),
                                    isFromUser: fc.boolean(),
                                    from: fc.record({ name: fc.string(), email: fc.emailAddress() })
                                }),
                                { minLength: 1, maxLength: 3 }
                            )
                        }),
                        { minLength: 0, maxLength: 5 }
                    ),
                    fc.string(), // Random AI response for triage
                    fc.string(), // Random AI response for brief
                    async (threads, triageAiResponse, briefAiResponse) => {
                        (prisma.thread.findMany as any).mockResolvedValue(threads);

                        // We mock askBrain to either return the string or a fallback
                        (askZenaService.askBrain as any).mockImplementation((prompt: string) => {
                            if (prompt.includes('Respond with JSON')) {
                                return Promise.resolve(JSON.stringify({
                                    summary: 'arbitrary',
                                    suggestedReply: 'arbitrary',
                                    proactiveActions: [],
                                    urgency: 'medium',
                                    category: 'other'
                                }));
                            }
                            return Promise.resolve(briefAiResponse);
                        });

                        const result = await emailTriageService.generateFullTriageReport('user-1');

                        expect(result).toHaveProperty('date');
                        expect(result).toHaveProperty('unreadCount');
                        expect(result).toHaveProperty('reports');
                        expect(result).toHaveProperty('overallBrief');
                        expect(typeof result.overallBrief).toBe('string');
                        expect(Array.isArray(result.reports)).toBe(true);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });
});
