/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterState } from './useFilterState';
import { Thread } from '../models/newPage.types';

describe('useFilterState Search Bug Reproduction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mockThreads: Thread[] = [
        {
            id: '1',
            subject: 'Buyer inquiry about property',
            participants: [
                { id: 'p1', name: 'John Doe', email: 'john@example.com', role: 'buyer' }
            ],
            classification: 'buyer',
            riskLevel: 'high',
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            summary: 'John is interested in the property.',
            propertyAddress: '123 Main St, Springfield',
            messageCount: 1,
            unreadCount: 1
        },
        {
            id: '2',
            subject: 'Vendor update on marketing',
            participants: [
                'Jane Smith <jane@vendor.com>'
            ] as any, // Testing string participant
            classification: 'vendor',
            riskLevel: 'low',
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            summary: 'Marketing materials are ready.',
            propertyAddress: '456 Oak Ave, Capital City',
            messageCount: 2,
            unreadCount: 0
        },
        {
            id: '3',
            subject: 'Contract review',
            participants: [
                { id: 'p3', name: 'Lawyer Lee', email: 'lee@law.com' }
            ],
            classification: 'lawyer_broker' as any,
            riskLevel: 'medium',
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            summary: 'Please review the attached contract.',
            aiSummary: 'Legal review required for the draft.',
            messageCount: 5,
            unreadCount: 2
        }
    ];

    it('should filter out non-matching threads (Subject)', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('property');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(1);
        expect(result.current.filteredThreads[0].id).toBe('1');
    });

    it('should filter by participant name (Object)', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('John');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(1);
        expect(result.current.filteredThreads[0].id).toBe('1');
    });

    it('should filter by participant name (String)', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('Jane');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(1);
        expect(result.current.filteredThreads[0].id).toBe('2');
    });

    it('should filter by summary', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('interested');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(1);
        expect(result.current.filteredThreads[0].id).toBe('1');
    });

    it('should filter by AI summary', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('Legal review');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(1);
        expect(result.current.filteredThreads[0].id).toBe('3');
    });

    it('should be empty for nonsensical search', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('xyzpdq');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(0);
    });

    it('should filter by property address', () => {
        const { result } = renderHook(() => useFilterState(mockThreads));

        act(() => {
            result.current.setSearchQuery('Main St');
        });

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredThreads.length).toBe(1);
        expect(result.current.filteredThreads[0].id).toBe('1');
    });
});
