import { describe, it, expect } from 'vitest';
import { ProactivenessService } from '../../services/proactiveness.service.js';

describe('ProactivenessService', () => {
    const service = new ProactivenessService();

    describe('checkGaps', () => {
        // 1. Calendar Domain Tests
        it('should identify gaps when location is missing for calendar', () => {
            const data = { title: 'Meeting', time: '10:00', endTime: '11:00', type: 'meeting' };
            const result = service.checkGaps('calendar', data);

            expect(result.hasGaps).toBe(true);
            const locationGap = result.missingFields.find(f => f.key === 'location');
            expect(locationGap).toBeDefined();
            expect(locationGap?.question).toContain('Where is this taking place?');
        });

        it('should NOT identify gaps when location is in root', () => {
            const data = {
                title: 'Meeting', time: '10:00', endTime: '11:00', type: 'meeting',
                location: 'Office'
            };
            const result = service.checkGaps('calendar', data);
            expect(result.missingFields.find(f => f.key === 'location')).toBeUndefined();
        });

        it('should NOT identify gaps when location is in metadata', () => {
            const data = {
                title: 'Meeting', time: '10:00', endTime: '11:00', type: 'meeting',
                metadata: { location: 'Office' }
            };
            const result = service.checkGaps('calendar', data);
            expect(result.missingFields.find(f => f.key === 'location')).toBeUndefined();
        });

        // 2. Contact Domain Tests (Critical Priority)
        it('should mark Name and Role as critical gaps', () => {
            const data = {};
            const result = service.checkGaps('contact', data);

            const nameGap = result.missingFields.find(f => f.key === 'name');
            const roleGap = result.missingFields.find(f => f.key === 'role');

            expect(nameGap?.priority).toBe('critical');
            expect(roleGap?.priority).toBe('critical');
        });

        // 3. Conditional Logic Tests (Buyer vs Seller)
        it('should ask for Budget if role is Buyer', () => {
            const data = { name: 'John', role: 'Buyer' };
            const result = service.checkGaps('contact', data);

            const budgetGap = result.missingFields.find(f => f.key === 'zenaIntelligence.minBudget');
            expect(budgetGap).toBeDefined();
        });

        it('should NOT ask for Budget if role is Vendor', () => {
            const data = { name: 'John', role: 'Vendor' };
            const result = service.checkGaps('contact', data);

            const budgetGap = result.missingFields.find(f => f.key === 'zenaIntelligence.minBudget');
            expect(budgetGap).toBeUndefined();
        });

        // 4. Deal Logic Tests
        it('should ask for Sale Method ONLY for Seller deals', () => {
            const sellerData = { pipelineType: 'seller', propertyId: '123' };
            const buyerData = { pipelineType: 'buyer', propertyId: '123' };

            const sellerResult = service.checkGaps('deal', sellerData);
            const buyerResult = service.checkGaps('deal', buyerData);

            expect(sellerResult.missingFields.find(f => f.key === 'saleMethod')).toBeDefined();
            expect(buyerResult.missingFields.find(f => f.key === 'saleMethod')).toBeUndefined();
        });

        // 5. Task Domain Tests
        it('should identify gaps in Task', () => {
            const data = { label: 'Call Vendor' };
            const result = service.checkGaps('task', data);

            // Missing Due Date (High)
            expect(result.missingFields.find(f => f.key === 'dueDate')).toBeDefined();
        });

        // 6. Inbox (Email) Domain Tests
        it('should identify critical gaps in Email', () => {
            const data = { to: 'hamish@test.com' };
            // Missing Subject and Body (Critical)
            const result = service.checkGaps('inbox', data);

            const subjectGap = result.missingFields.find(f => f.key === 'subject');
            const bodyGap = result.missingFields.find(f => f.key === 'body');

            expect(subjectGap).toBeDefined();
            expect(bodyGap?.question).toContain('What should I say');
        });
    });

    describe('synthesizeProactiveStatement', () => {
        it('should ask the critical question first', () => {
            const data = { name: 'John' }; // Missing Role (Critical) and Email (High)
            const result = service.synthesizeProactiveStatement('contact.create', data);
            const statement = result.text;

            expect(statement).toContain("What is their role?");
            expect(statement).toContain("I also need: Email Address");
        });
    });
});
