import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PropertyIntelligenceService } from './property-intelligence.service.js';
import prisma from '../config/database.js';

/**
 * Unit Tests for Property Intelligence Service
 * Tests all AI-powered functions for the Properties page
 */

// Mock the websocket service to avoid real broadcasts
vi.mock('./websocket.service.js', () => ({
    websocketService: {
        broadcastToUser: vi.fn()
    }
}));

// Mock fetch for Gemini API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PropertyIntelligenceService', () => {
    let service: PropertyIntelligenceService;
    let testUserId: string;
    let testPropertyId: string;

    beforeEach(async () => {
        service = new PropertyIntelligenceService();

        // Create test user and property
        const user = await prisma.user.create({
            data: {
                email: `test-intel-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Test User'
            }
        });
        testUserId = user.id;

        const property = await prisma.property.create({
            data: {
                userId: testUserId,
                address: '123 Test Street, Sydney NSW 2000',
                type: 'residential',
                status: 'active',
                listingPrice: 1250000,
                bedrooms: 4,
                bathrooms: 2,
                viewingCount: 10,
                inquiryCount: 20,
                milestones: []
            }
        });
        testPropertyId = property.id;

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(async () => {
        // Cleanup
        try {
            await prisma.propertyPrediction.deleteMany({ where: { propertyId: testPropertyId } });
            await prisma.property.deleteMany({ where: { userId: testUserId } });
            await prisma.user.delete({ where: { id: testUserId } });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('refreshIntelligence', () => {
        it('should return prediction with required fields', async () => {
            // Mock successful Gemini API response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    momentumScore: 75,
                                    buyerInterestLevel: 'High',
                                    reasoning: 'Strong buyer activity',
                                    predictedSaleDate: '2024-06-15',
                                    confidenceScore: 0.8,
                                    suggestedActions: [
                                        { action: 'Schedule open home', reasoning: 'Test reasoning', impact: 'High' },
                                        { action: 'Contact interested buyers', reasoning: 'Test reasoning', impact: 'Medium' }
                                    ]
                                })
                            }]
                        }
                    }]
                })
            });

            const result = await service.refreshIntelligence(testPropertyId, testUserId);

            expect(result).toBeDefined();
            expect(result.momentumScore).toBeGreaterThanOrEqual(0);
            expect(result.momentumScore).toBeLessThanOrEqual(100);
            expect(['Low', 'Medium', 'High', 'Hot']).toContain(result.buyerInterestLevel);
            expect(Array.isArray(result.suggestedActions)).toBe(true);
            expect(result.propertyId).toBe(testPropertyId);
        });

        it('should use fallback when API key is missing', async () => {
            // Temporarily unset API key
            const originalKey = process.env.GEMINI_API_KEY;
            delete process.env.GEMINI_API_KEY;

            const result = await service.refreshIntelligence(testPropertyId, testUserId);

            expect(result).toBeDefined();
            expect(result.momentumScore).toBeGreaterThanOrEqual(0);
            expect(result.suggestedActions.length).toBeGreaterThan(0);

            // Restore API key
            process.env.GEMINI_API_KEY = originalKey;
        });

        it('should throw error for non-existent property', async () => {
            await expect(service.refreshIntelligence('non-existent-id', testUserId))
                .rejects.toThrow('Property not found');
        });

        it('should store prediction in database', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify({
                                    momentumScore: 80,
                                    buyerInterestLevel: 'Hot',
                                    reasoning: 'Multiple offers expected',
                                    predictedSaleDate: '2024-07-01',
                                    confidenceScore: 0.9,
                                    suggestedActions: [
                                        { action: 'Set deadline for offers', reasoning: 'Test reasoning', impact: 'High' }
                                    ]
                                })
                            }]
                        }
                    }]
                })
            });

            await service.refreshIntelligence(testPropertyId, testUserId);

            // Verify stored in database
            const stored = await prisma.propertyPrediction.findUnique({
                where: { propertyId: testPropertyId }
            });

            expect(stored).toBeDefined();
            expect(stored?.momentumScore).toBe(80);
            expect(stored?.buyerInterestLevel).toBe('Hot');
        });
    });

    describe('calculatePropertyHeat', () => {
        it('should return heat data', async () => {
            const result = await service.calculatePropertyHeat(testPropertyId);

            expect(result).toBeDefined();
            expect(typeof result.score).toBe('number');
            expect(typeof result.reasoning).toBe('string');
        });
    });

    describe('findSmartMatches', () => {
        it('should return array of matches', async () => {
            const matches = await service.findSmartMatches(testPropertyId);

            expect(Array.isArray(matches)).toBe(true);
        });

        it('should include required fields in each match', async () => {
            // Create a buyer contact
            await prisma.contact.create({
                data: {
                    userId: testUserId,
                    name: 'Test Buyer',
                    emails: ['buyer@test.com'],
                    role: 'buyer'
                }
            });

            const matches = await service.findSmartMatches(testPropertyId);

            if (matches.length > 0) {
                const match = matches[0];
                expect(match).toHaveProperty('contactId');
                expect(match).toHaveProperty('name');
                expect(match).toHaveProperty('matchScore');
                expect(match).toHaveProperty('matchReason');
            }
        });
    });

    describe('getMarketPulse', () => {
        it('should return market pulse data', async () => {
            const pulse = await service.getMarketPulse(testUserId);

            expect(pulse).toBeDefined();
            expect(typeof pulse.totalBuyerMatches).toBe('number');
            expect(typeof pulse.hotPropertiesCount).toBe('number');
            expect(typeof pulse.staleListingsCount).toBe('number');
            expect(typeof pulse.vendorContactOverdueCount).toBe('number');
        });
    });
});

describe('PropertyIntelligenceService Edge Cases', () => {
    let service: PropertyIntelligenceService;
    let testUserId: string;
    let testPropertyId: string;

    beforeEach(async () => {
        service = new PropertyIntelligenceService();
        const user = await prisma.user.create({
            data: {
                email: `edge-test-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Edge Test User'
            }
        });
        testUserId = user.id;

        const property = await prisma.property.create({
            data: {
                userId: testUserId,
                address: 'Edge Case Property',
                milestones: []
            }
        });
        testPropertyId = property.id;
    });

    afterEach(async () => {
        try {
            await prisma.propertyPrediction.deleteMany({ where: { propertyId: testPropertyId } });
            await prisma.property.deleteMany({ where: { userId: testUserId } });
            await prisma.user.delete({ where: { id: testUserId } });
        } catch {
            // Ignore
        }
    });

    it('should handle property with no viewings or inquiries', async () => {
        const result = await service.calculatePropertyHeat(testPropertyId);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle property with null optional fields', async () => {
        const result = await service.calculatePropertyHeat(testPropertyId);

        expect(result).toBeDefined();
        expect(typeof result.score).toBe('number');
    });
});
