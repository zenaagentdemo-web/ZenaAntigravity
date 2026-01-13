import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S126: Automated Vendor Reporting', () => {
    it('should generate a vendor report with key stats', async () => {
        const userId = 'user_126';
        const propertyId = 'p126';
        const result = await journeyService.generateVendorReport(userId, propertyId);

        expect(result.stats.viewings).toBe(15);
        expect(result.reportUrl).toContain('.pdf');
        expect(result.status).toBe('report_generated');
        console.log('✅ Scenario S126 Passed: Vendor Reporting verified');
    });
});
