import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyDatesSection } from './KeyDatesSection';
import { Deal } from '../../types';
import React from 'react';

// Mock useDealNavigation
vi.mock('../../../../hooks/useDealNavigation', () => ({
    useDealNavigation: () => ({
        navigateToFromDeal: vi.fn(),
    }),
}));

const mockDeal: Deal = {
    id: 'deal-1',
    userId: 'user-1',
    pipelineType: 'seller',
    stage: 'listing_signed',
    stageEnteredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    lastContactAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    auctionDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days in future
    settlementDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days in future
    property: { id: 'prop-1', address: '282 Dominion Road' },
    contacts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
} as any;

describe('KeyDatesSection Sorting Logic', () => {
    it('should sort dates: most recent past first, then future dates ascending', () => {
        const { container } = render(<KeyDatesSection deal={mockDeal} settlementDaysRemaining={30} expanded={true} />);

        const items = Array.from(container.querySelectorAll('.key-dates__label'));
        const labels = items.map(item => item.textContent);

        // Expected Order:
        // 1. Last Contact (1 day ago) - Most recent past
        // 2. Entered listing signed (5 days ago) - Older past
        // 3. Auction (10 days in future) - Soonest future
        // 4. Settlement (30 days in future) - Later future

        expect(labels).toEqual([
            'Last Contact',
            'Entered listing signed',
            'Auction',
            'Settlement'
        ]);
    });

    it('should handle only future dates correctly', () => {
        const futureOnlyDeal = {
            ...mockDeal,
            stageEnteredAt: undefined,
            lastContactAt: undefined,
            settlementDate: undefined,
            auctionDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            tenderCloseDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any;

        const { container } = render(<KeyDatesSection deal={futureOnlyDeal} settlementDaysRemaining={null} expanded={true} />);

        const items = Array.from(container.querySelectorAll('.key-dates__label'));
        const labels = items.map(item => item.textContent);

        // Expected Order: 
        // 1. Tender Closes (5 days away)
        // 2. Auction (10 days away)
        expect(labels).toEqual(['Tender Closes', 'Auction']);
    });

    it('should handle only past dates correctly', () => {
        const pastOnlyDeal = {
            ...mockDeal,
            auctionDate: undefined,
            settlementDate: undefined,
            stageEnteredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        } as any;

        const { container } = render(<KeyDatesSection deal={pastOnlyDeal} settlementDaysRemaining={null} expanded={true} />);

        const items = Array.from(container.querySelectorAll('.key-dates__label'));
        const labels = items.map(item => item.textContent);

        // Expected Order:
        // 1. Last Contact (2 days ago)
        // 2. Entered listing signed (10 days ago)
        expect(labels).toEqual(['Last Contact', 'Entered listing signed']);
    });
});
