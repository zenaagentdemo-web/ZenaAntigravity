import { describe, it, expect, vi } from 'vitest';
import { createPropertyTool } from '../../tools/properties/create-property.tool.js';
import prisma from '../../config/database.js';

// Mock Prisma
vi.mock('../../config/database.js', () => ({
    default: {
        property: {
            create: vi.fn().mockResolvedValue({
                id: 'prop_123',
                address: '22 Boundary Road, Taupo',
                listingPrice: null,
                rateableValue: 850000,
                lastSalePrice: 560000,
                lastSaleDate: new Date('2022-05-15'),
                vendors: []
            })
        },
        contact: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        }
    }
}));

// Mock other services
vi.mock('../../services/market-scraper.service.js', () => ({
    marketScraperService: {
        getPropertyDetails: vi.fn().mockResolvedValue(null)
    }
}));

vi.mock('../../services/logger.service.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('Zero-Click Property Creation (Phase 7)', () => {

    it('should NOT require approval', () => {
        expect(createPropertyTool.requiresApproval).toBe(false);
    });

    it('should NOT require listingPrice in input schema', () => {
        const required = createPropertyTool.inputSchema.required;
        expect(required).not.toContain('listingPrice');
    });

    it('should execute successfully without listingPrice', async () => {
        const params = {
            address: '22 Boundary Road, Taupo',
            rateableValue: 850000
        };

        const result = await createPropertyTool.execute(params, { userId: 'user_123' });

        expect(result.success).toBe(true);
        expect(prisma.property.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                address: expect.stringContaining('22 Boundary Road, Taupo'),
                listingPrice: null,
                rateableValue: 850000
            })
        }));
    });

    it('should persist Last Sale data if provided', async () => {
        const params = {
            address: '22 Boundary Road, Taupo',
            lastSoldPrice: 560000,
            lastSoldDate: '2022-05-15'
        };

        await createPropertyTool.execute(params, { userId: 'user_123' });

        expect(prisma.property.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                // Address might change due to geocoding, so we just check it contains the original
                address: expect.stringContaining('22 Boundary Road, Taupo'),
                lastSalePrice: 560000,
                lastSaleDate: expect.any(Date)
            })
        }));
    });
});
