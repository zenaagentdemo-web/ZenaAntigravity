import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S123: Legal Document Parser', () => {
    it('should parse legal documents and extract key dates', async () => {
        const userId = 'user_123';
        const documentId = 'doc_123';
        const dealId = 'deal_123';
        const result = await journeyService.parseLegalDocument(userId, documentId, dealId);

        expect(result.extractedData.sunsetClause).toBe('2024-12-01');
        expect(result.status).toBe('parsing_complete');
        console.log('✅ Scenario S123 Passed: Legal Parser verified');
    });
});
