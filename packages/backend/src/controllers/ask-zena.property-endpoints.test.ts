import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import * as askZenaController from './ask-zena.controller.js';
import prisma from '../config/database.js';

/**
 * Unit Tests for Ask Zena Controller - Property Endpoints
 * Tests all AI-powered property-related endpoints
 */

// Mock the ask-zena service
vi.mock('../services/ask-zena.service.js', () => ({
    askZenaService: {
        parsePropertySearchQuery: vi.fn(),
        parsePropertyDetails: vi.fn(),
        askBrain: vi.fn()
    }
}));

import { askZenaService } from '../services/ask-zena.service.js';

describe('Ask Zena Controller - Property Endpoints', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let responseData: any;
    let statusCode: number;

    beforeEach(() => {
        responseData = null;
        statusCode = 200;

        mockRes = {
            status: vi.fn().mockImplementation((code) => {
                statusCode = code;
                return mockRes;
            }),
            json: vi.fn().mockImplementation((data) => {
                responseData = data;
                return mockRes;
            })
        };

        mockReq = {
            user: { id: 'test-user-id', userId: 'test-user-id' } as any,
            body: {},
            params: {}
        };

        vi.clearAllMocks();
    });

    describe('POST /api/ask/property-search', () => {
        it('should parse property search query successfully', async () => {
            const mockResult = {
                status: 'active',
                type: 'residential',
                priceMax: 1500000,
                keywords: 'sydney',
                aiInsight: 'Filtering for residential properties in Sydney'
            };

            (askZenaService.parsePropertySearchQuery as any).mockResolvedValue(mockResult);

            mockReq.body = { query: 'residential properties in sydney under 1.5 million' };

            await askZenaController.parsePropertySearchQuery(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(200);
            expect(responseData).toEqual(mockResult);
            expect(askZenaService.parsePropertySearchQuery).toHaveBeenCalledWith(
                'test-user-id',
                'residential properties in sydney under 1.5 million'
            );
        });

        it('should return 400 when query is missing', async () => {
            mockReq.body = {};

            await askZenaController.parsePropertySearchQuery(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(400);
            expect(responseData.error).toBe('Search query is required');
        });

        it('should return 401 when user is not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.body = { query: 'test query' };

            await askZenaController.parsePropertySearchQuery(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(401);
        });
    });

    describe('POST /api/ask/parse-property (Magic Paste)', () => {
        it('should parse property details from text', async () => {
            const mockResult = {
                address: '123 Test Street, Auckland',
                type: 'residential',
                listingPrice: 1200000,
                bedrooms: 4,
                bathrooms: 2,
                landSize: 650
            };

            (askZenaService.parsePropertyDetails as any).mockResolvedValue(mockResult);

            mockReq.body = { text: 'Beautiful 4 bed home at 123 Test Street, Auckland. $1.2M' };

            await askZenaController.parsePropertyDetails(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(200);
            expect(responseData.address).toBe('123 Test Street, Auckland');
            expect(responseData.bedrooms).toBe(4);
        });

        it('should return 400 when text is missing', async () => {
            mockReq.body = {};

            await askZenaController.parsePropertyDetails(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(400);
            expect(responseData.error).toBe('Text is required');
        });
    });

    describe('POST /api/ask/schedule-suggestions', () => {
        it('should return AI-generated schedule suggestions', async () => {
            const mockSuggestions = [
                'Saturday 11:00 AM - 12:00 PM',
                'Sunday 1:00 PM - 2:00 PM',
                'Wednesday 5:30 PM - 6:30 PM'
            ];

            (askZenaService.askBrain as any).mockResolvedValue(JSON.stringify(mockSuggestions));

            mockReq.body = {
                propertyId: 'test-property-id',
                address: '123 Test St',
                type: 'residential',
                daysOnMarket: 30,
                buyerInterest: 'High'
            };

            await askZenaController.getScheduleSuggestions(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(200);
            expect(responseData.suggestions).toBeDefined();
            expect(Array.isArray(responseData.suggestions)).toBe(true);
        });

        it('should return fallback suggestions on error', async () => {
            (askZenaService.askBrain as any).mockRejectedValue(new Error('API Error'));

            mockReq.body = {
                propertyId: 'test-property-id',
                address: '123 Test St'
            };

            await askZenaController.getScheduleSuggestions(mockReq as Request, mockRes as Response);

            // Should still return 200 with fallback
            expect(statusCode).toBe(200);
            expect(responseData.suggestions).toBeDefined();
            expect(responseData.suggestions.length).toBe(3);
        });
    });

    describe('POST /api/ask/milestone-suggestions', () => {
        it('should return AI-generated milestone suggestions', async () => {
            const mockSuggestions = ['First Open Home', 'Marketing Review', 'Price Strategy Meeting'];

            (askZenaService.askBrain as any).mockResolvedValue(JSON.stringify(mockSuggestions));

            mockReq.body = {
                propertyId: 'test-property-id',
                status: 'active',
                daysOnMarket: 15,
                existingMilestones: []
            };

            await askZenaController.getMilestoneSuggestions(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(200);
            expect(responseData.suggestions).toBeDefined();
            expect(Array.isArray(responseData.suggestions)).toBe(true);
        });

        it('should return status-appropriate fallback on error', async () => {
            (askZenaService.askBrain as any).mockRejectedValue(new Error('API Error'));

            mockReq.body = {
                propertyId: 'test-id',
                status: 'under_contract'
            };

            await askZenaController.getMilestoneSuggestions(mockReq as Request, mockRes as Response);

            // Should return under_contract specific fallbacks
            expect(statusCode).toBe(200);
            expect(responseData.suggestions).toContain('Finance Approval');
        });
    });

    describe('POST /api/ask/timeline-summary', () => {
        it('should return AI-generated timeline summary', async () => {
            const mockSummary = 'Active engagement with 5 interactions this week. Strong buyer interest shown.';

            (askZenaService.askBrain as any).mockResolvedValue(mockSummary);

            mockReq.body = {
                propertyId: 'test-property-id',
                events: [
                    { type: 'note', summary: 'Buyer showed interest', timestamp: '2024-01-15' },
                    { type: 'email', summary: 'Sent details', timestamp: '2024-01-16' }
                ]
            };

            await askZenaController.getTimelineSummary(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(200);
            expect(responseData.summary).toBeDefined();
            expect(typeof responseData.summary).toBe('string');
        });

        it('should handle empty events array', async () => {
            mockReq.body = {
                propertyId: 'test-property-id',
                events: []
            };

            await askZenaController.getTimelineSummary(mockReq as Request, mockRes as Response);

            expect(statusCode).toBe(200);
            expect(responseData.summary).toContain('No activity');
        });
    });
});

describe('Ask Zena Property Endpoints - Integration Tests', () => {
    let testUserId: string;

    beforeEach(async () => {
        // Create test user for integration tests
        const user = await prisma.user.create({
            data: {
                email: `ask-zena-test-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Ask Zena Test User'
            }
        });
        testUserId = user.id;
    });

    afterEach(async () => {
        try {
            await prisma.property.deleteMany({ where: { userId: testUserId } });
            await prisma.user.delete({ where: { id: testUserId } });
        } catch {
            // Ignore cleanup errors
        }
    });

    it('should have endpoint functions defined', () => {
        expect(typeof askZenaController.parsePropertySearchQuery).toBe('function');
        expect(typeof askZenaController.parsePropertyDetails).toBe('function');
        expect(typeof askZenaController.getScheduleSuggestions).toBe('function');
        expect(typeof askZenaController.getMilestoneSuggestions).toBe('function');
        expect(typeof askZenaController.getTimelineSummary).toBe('function');
    });
});
