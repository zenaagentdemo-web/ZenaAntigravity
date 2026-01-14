import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarPage } from './CalendarPage';
import React from 'react';
import * as fc from 'fast-check';

// Mock API Client
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../utils/apiClient', () => ({
    api: {
        get: (...args: any[]) => mockGet(...args),
        post: (...args: any[]) => mockPost(...args)
    }
}));

// Mock Router Hooks
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
    useLocation: () => ({ pathname: '/calendar' }),
    Link: ({ children }: any) => <a>{children}</a>,
    MemoryRouter: ({ children }: any) => <div>{children}</div>,
    Routes: ({ children }: any) => <div>{children}</div>,
    Route: ({ children }: any) => <div>{children}</div>
}));

// Mock Child Components
vi.mock('../../components/ScheduleOpenHomeModal/ScheduleOpenHomeModal', () => ({ ScheduleOpenHomeModal: () => null }));
vi.mock('../../components/CalendarMiniPicker/CalendarMiniPicker', () => ({ CalendarMiniPicker: () => null }));
vi.mock('../../components/GodmodeToggle/GodmodeToggle', () => ({ GodmodeToggle: () => null }));
vi.mock('../../hooks/useGodmode', () => ({ useGodmode: () => ({ pendingCount: 0 }) }));
vi.mock('../../components/CalendarOptimizationModal/OptimiseProposalModal', () => ({ OptimiseProposalModal: () => null }));
vi.mock('../../components/ActionApprovalQueue/ActionApprovalQueue', () => ({ ActionApprovalQueue: () => null }));

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
    Sparkles: () => null, Calendar: () => null, CheckCircle2: () => null, MapPin: () => null,
    Clock: () => null, ArrowRight: () => null, ChevronLeft: () => null, ChevronRight: () => null,
    AlertTriangle: () => null, X: () => null, Plus: () => null, Brain: () => null
}));

// Mock scrollIntoView
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}
const scrollIntoViewMock = vi.spyOn(Element.prototype, 'scrollIntoView');

describe('CalendarPage Scroll Property-Based Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        scrollIntoViewMock.mockClear();

        mockGet.mockImplementation((url) => {
            if (url.includes('/api/properties')) return Promise.resolve({ data: { properties: [] } });
            if (url.includes('/api/tasks')) return Promise.resolve({ data: { tasks: [] } });
            if (url.includes('/api/timeline')) return Promise.resolve({ data: { events: [] } });
            return Promise.resolve({ data: { success: true } });
        });

        mockPost.mockResolvedValue({ data: { success: true, warnings: [] } });

        vi.setSystemTime(new Date('2026-01-14T01:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should scroll on initial load with data', async () => {
        mockGet.mockImplementation((url) => {
            if (url.includes('/api/timeline')) return Promise.resolve({
                data: { events: [{ id: '1', summary: 'Test', timestamp: '2026-01-14T05:00:00Z', type: 'meeting' }] }
            });
            return Promise.resolve({ data: { properties: [], tasks: [], success: true } });
        });

        render(<CalendarPage />);

        // Flush promises and advance timers
        for (let i = 0; i < 10; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });
        }

        await waitFor(() => {
            expect(scrollIntoViewMock).toHaveBeenCalled();
        }, { timeout: 5000 });
    });

    it('property: should always call scrollIntoView when events are today', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        id: fc.string(),
                        summary: fc.string(),
                        timestamp: fc.date({ min: new Date('2026-01-14T00:00:01Z'), max: new Date('2026-01-14T23:59:59Z') }),
                        type: fc.constant('meeting'),
                        metadata: fc.record({ location: fc.string() })
                    }),
                    { minLength: 1, maxLength: 2 }
                ),
                async (events) => {
                    vi.clearAllMocks();
                    scrollIntoViewMock.mockClear();
                    mockGet.mockImplementation((url) => {
                        if (url.includes('/api/timeline')) return Promise.resolve({ data: { events } });
                        return Promise.resolve({ data: { success: true } });
                    });

                    render(<CalendarPage />);

                    for (let i = 0; i < 10; i++) {
                        await act(async () => {
                            await vi.advanceTimersByTimeAsync(100);
                        });
                    }

                    await waitFor(() => {
                        expect(scrollIntoViewMock).toHaveBeenCalled();
                    }, { timeout: 5000 });
                }
            ),
            { numRuns: 1 }
        );
    }, 60000);
});
