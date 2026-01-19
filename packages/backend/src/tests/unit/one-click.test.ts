import { describe, it, expect } from 'vitest';
import { ProactivenessService } from '../../services/proactiveness.service.js';

describe('ProactivenessService - One-Click Actions', () => {
    const service = new ProactivenessService();

    it('should return structured ProactiveResult including suggestedActions', () => {
        const data = {
            name: 'John Doe',
            role: 'Vendor',
            email: 'john@example.com'
        };
        // Expecting "Create Property" or "Sync Email" suggestions
        const result = service.synthesizeProactiveStatement('contact.create', data);

        expect(typeof result).toBe('object');
        expect(result.text).toBeDefined();
        expect(result.suggestedActions).toBeDefined();
        expect(Array.isArray(result.suggestedActions)).toBe(true);
    });

    it('should suggest Marketing Campaign when property is active but has no campaign', () => {
        const data = {
            id: 'prop-123',
            address: '123 Main St',
            status: 'active',
            marketing: { campaignId: null }
        };

        const result = service.synthesizeProactiveStatement('property.create', data);

        expect(result.suggestedActions?.some(a => a.toolName === 'marketing.generate_campaign')).toBe(true);
        const action = result.suggestedActions?.find(a => a.toolName === 'marketing.generate_campaign');
        expect(action?.payload.propertyId).toBe('prop-123');
        expect(action?.label).toContain('Plan Campaign');
    });

    it('should suggest Weekly Report when viewing a Deal', () => {
        const data = {
            id: 'deal-456',
            propertyId: 'prop-123',
            propertyAddress: '123 Main St',
            stage: 'active',
            pipelineType: 'seller',
            saleMethod: 'auction', // Required for seller to clear gaps
            dealValue: 1000000,
            lastReportDate: null
        };

        const result = service.synthesizeProactiveStatement('deal.create', data); // or deal.view/update

        // Simulate checking suggestions for deal
        // Note: 'deal.create' might trigger specific suggestions defined in getSuggestions

        expect(result.suggestedActions?.some(a => a.toolName === 'vendor_report.generate_weekly')).toBe(true);
        const action = result.suggestedActions?.find(a => a.toolName === 'vendor_report.generate_weekly');
        expect(action?.payload.dealId).toBe('deal-456');
    });
});
