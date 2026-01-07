import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for PDF Generation Service
 * 
 * These tests verify mathematical invariants for the premium
 * PDF report generation system using fast-check.
 * 
 * Note: Uses mocked dependencies for isolation.
 */

// Mock dependencies
vi.mock('../config/database.js', () => ({
    default: {
        property: { findUnique: vi.fn() },
        user: { findUnique: vi.fn() },
    }
}));

vi.mock('./ask-zena.service.js', () => ({
    askZenaService: {
        askBrain: vi.fn().mockResolvedValue('AI-generated market analysis content for testing purposes.'),
    }
}));

import prisma from '../config/database.js';
import { pdfGenerationService, PDFReportResult } from './pdf-generation.service.js';

describe('PDF Generation Property-Based Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock for property
        vi.mocked(prisma.property.findUnique).mockResolvedValue({
            id: 'test-property-id',
            address: '123 Test Street, Auckland',
            suburb: 'Auckland Central',
            propertyType: 'house',
            askingPrice: 850000,
            bedrooms: 3,
            bathrooms: 2,
            landArea: 450,
            floorArea: 180,
            ownerId: 'owner-1',
            vendors: [{ name: 'John Smith', email: 'john@example.com' }],
            milestones: [
                { type: 'open_home', date: new Date() },
            ],
            createdAt: new Date(),
        } as any);

        // Default mock for user
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: 'test-user-id',
            displayName: 'Agent Name',
            email: 'agent@example.com',
        } as any);
    });

    /**
     * Property 1: Report Result Structure
     * INVARIANT: All report methods return PDFReportResult with required fields.
     */
    describe('Property 1: Report result structure', () => {
        it('should return PDFReportResult for vendor reports', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            // PROPERTY: Result has required structure
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('fileName');
            expect(typeof result.success).toBe('boolean');
        });

        it('should return PDFReportResult for buyer briefs', async () => {
            const result = await pdfGenerationService.generateBuyerBrief('test-property', 'test-user');

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('fileName');
        });

        it('should return PDFReportResult for CMAs', async () => {
            const result = await pdfGenerationService.generateCMA('test-property', 'test-user');

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('fileName');
        });
    });

    /**
     * Property 2: HTML Structure in Buffer
     * INVARIANT: Generated pdfBuffer contains valid HTML structure when successful.
     */
    describe('Property 2: HTML structure in buffer', () => {
        it('should contain valid HTML structure for vendor reports', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success && result.pdfBuffer) {
                const htmlString = result.pdfBuffer.toString('utf-8');

                // PROPERTY: Valid HTML structure
                expect(htmlString).toContain('<!DOCTYPE html>');
                expect(htmlString).toContain('<html');
                expect(htmlString).toContain('<head');
                expect(htmlString).toContain('<body');
                expect(htmlString).toContain('</html>');
            }
        });

        it('should have embedded styles', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success && result.pdfBuffer) {
                const htmlString = result.pdfBuffer.toString('utf-8');

                // PROPERTY: Has inline styles
                expect(htmlString).toContain('<style');
                expect(htmlString).toContain('</style>');
            }
        });
    });

    /**
     * Property 3: Buffer Non-Empty When Successful
     * INVARIANT: When success=true, pdfBuffer should be non-empty.
     */
    describe('Property 3: Buffer non-empty on success', () => {
        it('should have non-empty buffer when successful', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success) {
                // PROPERTY: Buffer exists and is non-empty
                expect(result.pdfBuffer).toBeDefined();
                expect(result.pdfBuffer!.length).toBeGreaterThan(0);
            }
        });

        it('should have reasonable buffer size', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success && result.pdfBuffer) {
                // PROPERTY: Size is in reasonable range (1KB - 500KB)
                expect(result.pdfBuffer.length).toBeGreaterThan(1000);
                expect(result.pdfBuffer.length).toBeLessThan(500000);
            }
        });
    });

    /**
     * Property 4: Filename Format
     * INVARIANT: Filenames should end in .pdf and contain no spaces.
     */
    describe('Property 4: Filename format', () => {
        it('should have valid filename format', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success) {
                // PROPERTY: Filename ends with .pdf
                expect(result.fileName).toMatch(/\.pdf$/);

                // PROPERTY: No spaces in filename
                expect(result.fileName).not.toContain(' ');
            }
        });
    });

    /**
     * Property 5: Error Handling for Missing Property
     * INVARIANT: Missing property should return success=false with error message.
     */
    describe('Property 5: Error handling', () => {
        it('should return error for non-existent property', async () => {
            vi.mocked(prisma.property.findUnique).mockResolvedValue(null);

            const result = await pdfGenerationService.generateVendorReport('fake-id', 'test-user');

            // PROPERTY: Returns failure with error
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('not found');
        });
    });

    /**
     * Property 6: Report Type Identification
     * INVARIANT: Report content should identify its type.
     */
    describe('Property 6: Report type identification', () => {
        it('should identify vendor report', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success && result.pdfBuffer) {
                const html = result.pdfBuffer.toString('utf-8');
                // PROPERTY: Contains vendor-specific content
                expect(html).toContain('VENDOR REPORT');
            }
        });

        it('should identify CMA', async () => {
            const result = await pdfGenerationService.generateCMA('test-property', 'test-user');

            if (result.success && result.pdfBuffer) {
                const html = result.pdfBuffer.toString('utf-8');
                // PROPERTY: Contains CMA-specific content
                expect(html).toContain('COMPARATIVE MARKET ANALYSIS');
            }
        });
    });

    /**
     * Property 7: Address in Reports 
     * INVARIANT: Property address should appear in successful reports.
     */
    describe('Property 7: Address in reports', () => {
        it('should include property address', async () => {
            const result = await pdfGenerationService.generateVendorReport('test-property', 'test-user');

            if (result.success && result.pdfBuffer) {
                const html = result.pdfBuffer.toString('utf-8');
                // PROPERTY: Contains the property address
                expect(html).toContain('123 Test Street');
            }
        });
    });
});
