/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterState } from './useFilterState';
import { Thread } from '../models/newPage.types';

describe('useFilterState Normal Filter Bug Reproduction', () => {
    it('should correctly filter threads when "normal" filter is active', () => {
        // Create mixed threads
        const threads: Thread[] = [
            {
                id: '1',
                subject: 'High Risk Thread',
                participants: [],
                classification: 'buyer',
                riskLevel: 'high',
                lastMessageAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                summary: 'High risk',
                messageCount: 1,
                unreadCount: 0
            },
            {
                id: '2',
                subject: 'Low Risk Thread',
                participants: [],
                classification: 'vendor',
                riskLevel: 'low',
                lastMessageAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                summary: 'Low risk',
                messageCount: 1,
                unreadCount: 0
            },
            {
                id: '3',
                subject: 'None Risk Thread',
                participants: [],
                classification: 'market',
                riskLevel: 'none',
                lastMessageAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                summary: 'None risk',
                messageCount: 1,
                unreadCount: 0
            }
        ];

        const { result } = renderHook(() => useFilterState(threads));

        // Initial state
        expect(result.current.activeFilters).toEqual(['all']);
        expect(result.current.filteredThreads.length).toBe(3);

        // Verify counts
        // Normal count should be 2 (id 2 and 3)
        expect(result.current.filterCounts.normal).toBe(2);
        expect(result.current.filterCounts.high_risk).toBe(1);

        // Describe defect: When clicking "Normal", we expect 2 threads (Low and None risk)
        act(() => {
            result.current.setFilters(['normal']);
        });

        expect(result.current.activeFilters).toEqual(['normal']);
        expect(result.current.filteredThreads.length).toBe(2); // This should pass if logic is correct
        expect(result.current.filteredThreads.map(t => t.id).sort()).toEqual(['2', '3']);
    });
});
