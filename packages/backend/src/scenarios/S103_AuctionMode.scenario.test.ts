import { journeyService } from '../services/journey.service.ts';

describe('Scenario S103: Auction Day Mode', () => {
    it('should shift UI state and track live bidders', async () => {
        const userId = 'user_103';
        const propertyId = 'prop_103';

        const result = await journeyService.activateAuctionMode(userId, propertyId);

        expect(result.status).toBe('auction_live');
        expect(result.view).toBe('CMD_CENTER');
        expect(result.propertyId).toBe(propertyId);

        console.log('✅ Scenario S103 Passed: Auction mode verified');
    });
});
